import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const ALLOWED_PRODUCT_HOST = "minigt.tsm-models.com"
const ALLOWED_IMAGE_HOST = "minigt.tsm-models.com"
const MAX_IMAGES = 12
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MIN_IMAGE_BYTES = 80 * 1024
const STORAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || "diecast-images"
const STORAGE_BRAND_PREFIX = "mini-gt"
const IMPORT_RATE_LIMIT_WINDOW_MS = 60 * 1000
const IMPORT_RATE_LIMIT_MAX = 5
const importRateLimitMap = new Map<string, number[]>()
const ACCEPTED_IMAGE_PATH_PATTERNS = [
  "/upload/mini_gt/products_gif/product_pic_big/",
  "/upload/picfile/",
  "/upload/picfile_list/",
  "/upload/mini_gt/products_gif/product_pic_list/",
]

function sanitizeSeries(series: string): string | null {
  const normalized = series.trim().toUpperCase()
  return /^MGT\d{5}$/.test(normalized) ? normalized : null
}

function isAllowedProductUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === ALLOWED_PRODUCT_HOST &&
      parsed.pathname === "/index.php" &&
      parsed.searchParams.get("action") === "product-detail" &&
      !!parsed.searchParams.get("id")?.match(/^\d+$/)
    )
  } catch {
    return false
  }
}

function resolveImageUrl(src: string): string | null {
  try {
    const absolute = new URL(src, `https://${ALLOWED_IMAGE_HOST}`)
    if (absolute.hostname !== ALLOWED_IMAGE_HOST) return null
    if (!/\.(?:png|jpe?g|webp)$/i.test(absolute.pathname)) return null
    return absolute.toString()
  } catch {
    return null
  }
}

function getSafeExtensionFromUrl(imageUrl: string): string {
  const ext = path.extname(new URL(imageUrl).pathname).toLowerCase()
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg"
}

function getStoragePath(series: string, fileName: string): string {
  return `${STORAGE_BRAND_PREFIX}/${series}/${fileName}`
}

function isAcceptedImagePath(imageUrl: string): boolean {
  const pathname = new URL(imageUrl).pathname.toLowerCase()
  return ACCEPTED_IMAGE_PATH_PATTERNS.some((pattern) => pathname.includes(pattern))
}

function getImagePathPriority(imageUrl: string): number {
  const pathname = new URL(imageUrl).pathname.toLowerCase()
  if (pathname.includes("/upload/picfile/")) return 0
  if (pathname.includes("/upload/mini_gt/products_gif/product_pic_big/")) return 1
  if (pathname.includes("/upload/picfile_list/")) return 2
  if (pathname.includes("/upload/mini_gt/products_gif/product_pic_list/")) return 3
  return 99
}

function createOrderedImageCandidates(urls: string[]) {
  const firstSeenOrder = new Map<string, number>()
  urls.forEach((url, index) => {
    if (!firstSeenOrder.has(url)) {
      firstSeenOrder.set(url, index)
    }
  })

  return Array.from(firstSeenOrder.entries())
    .map(([url, index]) => ({
      url,
      index,
      priority: getImagePathPriority(url),
    }))
    .sort((a, b) => {
      const priorityDiff = a.priority - b.priority
      if (priorityDiff !== 0) return priorityDiff
      return a.index - b.index
    })
    .map((entry) => entry.url)
}

function extractPrimaryProductSection(html: string): string {
  const sectionCutMarkers = [
    "<h5>Related Products</h5>",
    "class=\"related_pro",
    "<!-- 相關產品 -->",
  ]

  const firstCutIndex = sectionCutMarkers
    .map((marker) => html.indexOf(marker))
    .filter((index) => index >= 0)
    .reduce<number | null>((earliest, index) => {
      if (earliest === null) return index
      return Math.min(earliest, index)
    }, null)

  if (firstCutIndex === null) return html
  return html.slice(0, firstCutIndex)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimitKey = session.user.id
    const now = Date.now()
    const recentRequests = (importRateLimitMap.get(rateLimitKey) || []).filter(
      (timestamp) => now - timestamp < IMPORT_RATE_LIMIT_WINDOW_MS
    )

    if (recentRequests.length >= IMPORT_RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many import requests. Please wait a minute." },
        { status: 429 }
      )
    }

    importRateLimitMap.set(rateLimitKey, [...recentRequests, now])

    const origin = request.headers.get("origin")
    const host = request.headers.get("host")
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
    }

    const body = await request.json()
    const productUrl = String(body?.productUrl || "").trim()
    const rawSeries = String(body?.series || "").trim()

    const safeSeries = sanitizeSeries(rawSeries)
    if (!safeSeries) {
      return NextResponse.json({ error: "Series must be like MGT00009" }, { status: 400 })
    }

    if (!isAllowedProductUrl(productUrl)) {
      return NextResponse.json(
        { error: "Only official Mini GT product-detail URLs are allowed" },
        { status: 400 }
      )
    }

    const productResponse = await fetch(productUrl, {
      method: "GET",
      headers: { "User-Agent": "diecast-expense-tracker/1.0" },
      cache: "no-store",
    })

    if (!productResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch product page" }, { status: 502 })
    }

    const html = await productResponse.text()
    const primaryHtml = extractPrimaryProductSection(html)

    const srcMatches = [...primaryHtml.matchAll(/src=["']([^"']+)["']/gi)]
    const srcBasedUrls = srcMatches
      .map((match) => match[1])
      .map(resolveImageUrl)
      .filter((url): url is string => !!url)
      .filter(isAcceptedImagePath)

    const directAbsoluteMatches = [
      ...primaryHtml.matchAll(
        /https:\/\/minigt\.tsm-models\.com\/upload\/[^\s"'?#]+\.(?:png|jpe?g|webp)/gi
      )
    ]
    const directRelativeMatches = [
      ...primaryHtml.matchAll(
        /(?:^|["'\s])(upload\/[^\s"'?#]+\.(?:png|jpe?g|webp))(?:$|["'\s])/gi
      )
    ]
    const directPatternUrls = [...directAbsoluteMatches, ...directRelativeMatches]
      .map((match) => match[1] || match[0])
      .map(resolveImageUrl)
      .filter((url): url is string => !!url)
      .filter(isAcceptedImagePath)

    const prioritizedImageUrls = createOrderedImageCandidates([...srcBasedUrls, ...directPatternUrls]).slice(0, MAX_IMAGES)

    const uniqueImageUrls = prioritizedImageUrls
    if (uniqueImageUrls.length === 0) {
      return NextResponse.json({ error: "No valid product images found" }, { status: 404 })
    }

    const savedUrls: string[] = []
    for (let index = 0; index < uniqueImageUrls.length; index += 1) {
      const imageUrl = uniqueImageUrls[index]
      const imageResponse = await fetch(imageUrl, {
        method: "GET",
        headers: { "User-Agent": "diecast-expense-tracker/1.0" },
        cache: "no-store",
      })

      if (!imageResponse.ok) continue

      const contentType = imageResponse.headers.get("content-type") || ""
      if (!contentType.startsWith("image/")) continue

      const arrayBuffer = await imageResponse.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_IMAGE_BYTES || arrayBuffer.byteLength < MIN_IMAGE_BYTES) continue

      const extension = getSafeExtensionFromUrl(imageUrl)
      const fileName = `${index + 1}${extension}`
      const storagePath = getStoragePath(safeSeries, fileName)
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: contentType || "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        })

      if (uploadError) continue
      savedUrls.push(`/api/mini-gt/image/${safeSeries}/${fileName}`)
    }

    if (savedUrls.length === 0) {
      return NextResponse.json({ error: "No images passed security checks" }, { status: 422 })
    }

    const { data: collection, error: collectionError } = await supabase
      .from("tbl_collection")
      .select("id, remark, item_no")
      .ilike("item_no", `${safeSeries}%`)
      .limit(1)
      .maybeSingle()

    if (collectionError) {
      return NextResponse.json({ error: "Failed to find collection by series" }, { status: 500 })
    }

    if (collection?.id) {
      const existingRemark: string = collection.remark || ""
      const existingLines = existingRemark
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
      const mergedLines = [...new Set([...existingLines, ...savedUrls])]
      const mergedRemark = mergedLines.join("\n")

      const { error: updateError } = await supabase
        .from("tbl_collection")
        .update({ remark: mergedRemark })
        .eq("id", collection.id)

      if (updateError) {
        return NextResponse.json({ error: "Images saved but failed to update collection remark" }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      series: safeSeries,
      importedCount: savedUrls.length,
      imageUrls: savedUrls,
    })
  } catch (error) {
    console.error("Mini GT import error:", error)
    return NextResponse.json({ error: "Unexpected import failure" }, { status: 500 })
  }
}
