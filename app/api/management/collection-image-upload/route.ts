import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_IMAGES,
  MIN_UPLOAD_IMAGE_BYTES,
  STORAGE_BUCKET,
  buildCatalogImageUrl,
  getBrandStorageSlug,
  getExtensionFromFileName,
  getExtensionFromMimeType,
  getNextImageIndex,
  getStoragePath,
  mergeRemarkImageUrls,
  resolveFolderKey,
} from "@/lib/collection-images"

const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000
const UPLOAD_RATE_LIMIT_MAX = 10
const uploadRateLimitMap = new Map<string, number[]>()

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

interface CollectionRow {
  id: string
  remark: string | null
  item_no: string | null
  name: string
  brand_id: number | null
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
    const recentRequests = (uploadRateLimitMap.get(rateLimitKey) || []).filter(
      (timestamp) => now - timestamp < UPLOAD_RATE_LIMIT_WINDOW_MS
    )

    if (recentRequests.length >= UPLOAD_RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a minute." },
        { status: 429 }
      )
    }

    uploadRateLimitMap.set(rateLimitKey, [...recentRequests, now])

    const origin = request.headers.get("origin")
    const host = request.headers.get("host")
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
    }

    const formData = await request.formData()
    const brandId = Number.parseInt(String(formData.get("brandId") || ""), 10)
    const collectionId = String(formData.get("collectionId") || "").trim()
    const itemNo = String(formData.get("itemNo") || "").trim()
    const collectionName = String(formData.get("collectionName") || "").trim()
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (!Number.isFinite(brandId) || brandId <= 0) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 })
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 })
    }

    if (files.length > MAX_UPLOAD_IMAGES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_UPLOAD_IMAGES} images at once` },
        { status: 400 }
      )
    }

    const { data: brand, error: brandError } = await supabase
      .from("tbl_master_brand")
      .select("id, name")
      .eq("id", brandId)
      .maybeSingle()

    if (brandError || !brand?.name) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    let collection: CollectionRow | null = null

    if (collectionId) {
      const { data, error } = await supabase
        .from("tbl_collection")
        .select("id, remark, item_no, name, brand_id")
        .eq("id", collectionId)
        .eq("brand_id", brandId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: "Failed to find collection item" }, { status: 500 })
      }

      collection = data as CollectionRow | null
      if (!collection) {
        return NextResponse.json({ error: "Collection item not found for this brand" }, { status: 404 })
      }
    }

    const resolved = resolveFolderKey({
      itemNo: collection?.item_no || itemNo || null,
      collectionName: collection?.name || collectionName || null,
      brandName: brand.name,
    })

    if (!resolved) {
      const hint = brand.name.toLowerCase().includes("mini gt")
        ? "Enter a series like MGT00009, or select/type the model name"
        : "Enter an item number or the model name"
      return NextResponse.json({ error: hint }, { status: 400 })
    }

    const { folderKey, source: folderKeySource } = resolved
    const brandSlug = getBrandStorageSlug(brand.name)

    if (!collection) {
      if (folderKeySource === "item_no") {
        const { data, error } = await supabase
          .from("tbl_collection")
          .select("id, remark, item_no, name, brand_id")
          .eq("brand_id", brandId)
          .ilike("item_no", `${folderKey}%`)
          .limit(1)
          .maybeSingle()

        if (error) {
          return NextResponse.json({ error: "Failed to find collection item" }, { status: 500 })
        }

        collection = data as CollectionRow | null
      } else {
        const lookupName = (collectionName || "").trim()
        if (lookupName) {
          const { data, error } = await supabase
            .from("tbl_collection")
            .select("id, remark, item_no, name, brand_id")
            .eq("brand_id", brandId)
            .ilike("name", lookupName)
            .limit(1)
            .maybeSingle()

          if (error) {
            return NextResponse.json({ error: "Failed to find collection item" }, { status: 500 })
          }

          collection = data as CollectionRow | null
        }
      }
    }

    let nextIndex = getNextImageIndex(collection?.remark || null, brandSlug, folderKey)
    const savedUrls: string[] = []

    for (const file of files) {
      if (!isImageFile(file)) continue
      if (file.size > MAX_IMAGE_BYTES || file.size < MIN_UPLOAD_IMAGE_BYTES) continue

      const extension =
        getExtensionFromFileName(file.name) || getExtensionFromMimeType(file.type || "image/jpeg")
      const fileName = `${nextIndex}${extension}`
      const storagePath = getStoragePath(brandSlug, folderKey, fileName)
      const arrayBuffer = await file.arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: file.type || "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        })

      if (uploadError) continue

      savedUrls.push(buildCatalogImageUrl(brandSlug, folderKey, fileName))
      nextIndex += 1
    }

    if (savedUrls.length === 0) {
      return NextResponse.json({ error: "No images were uploaded" }, { status: 422 })
    }

    if (collection?.id) {
      const mergedRemark = mergeRemarkImageUrls(collection.remark, savedUrls)
      const { error: updateError } = await supabase
        .from("tbl_collection")
        .update({
          remark: mergedRemark,
          updated_at: Math.floor(Date.now() / 1000),
        })
        .eq("id", collection.id)

      if (updateError) {
        return NextResponse.json(
          { error: "Images saved but failed to update collection remark" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      brandSlug,
      folderKey,
      folderKeySource,
      uploadedCount: savedUrls.length,
      imageUrls: savedUrls,
      linkedCollection: !!collection?.id,
    })
  } catch (error) {
    console.error("Collection image upload error:", error)
    return NextResponse.json({ error: "Unexpected upload failure" }, { status: 500 })
  }
}
