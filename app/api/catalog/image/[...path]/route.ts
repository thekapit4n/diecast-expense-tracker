import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  STORAGE_BUCKET,
  getMimeType,
  getStoragePath,
  isSafeBrandSlug,
  isSafeFileName,
  isSafeFolderKey,
} from "@/lib/collection-images"

function isLegacyMiniGtSeries(segment: string): boolean {
  return /^MGT\d{5}$/i.test(segment)
}

function resolveImagePath(
  segments: string[]
): { brandSlug: string; folderKey: string; fileName: string; isChase: boolean } | null {
  if (segments.length === 2) {
    const [first, fileName] = segments
    if (!isLegacyMiniGtSeries(first) || !isSafeFileName(fileName)) {
      return null
    }
    return {
      brandSlug: "mini-gt",
      folderKey: first.toUpperCase(),
      fileName: fileName.toLowerCase(),
      isChase: false,
    }
  }

  if (segments.length === 3 || segments.length === 4) {
    const isChase = segments.length === 4
    const [brandSlug, folderKey, variantOrFileName, fileNameIfChase] = segments
    if (isChase && variantOrFileName.toLowerCase() !== "chase") {
      return null
    }

    const fileName = isChase ? fileNameIfChase : variantOrFileName
    const normalizedBrandSlug = brandSlug.toLowerCase()
    const normalizedFolderKey =
      normalizedBrandSlug === "mini-gt" ? folderKey.toUpperCase() : folderKey
    const safeName = fileName.toLowerCase()

    if (
      !isSafeBrandSlug(normalizedBrandSlug) ||
      !isSafeFolderKey(normalizedFolderKey, normalizedBrandSlug) ||
      !isSafeFileName(safeName)
    ) {
      return null
    }

    return {
      brandSlug: normalizedBrandSlug,
      folderKey: normalizedFolderKey,
      fileName: safeName,
      isChase,
    }
  }

  return null
}

async function loadLocalMiniGtFallback(folderKey: string, safeName: string) {
  let fileBuffer: Buffer | null = null
  let resolvedName = safeName
  const numericPrefix = safeName.split(".")[0]
  const fallbackCandidates = [
    `${numericPrefix}.JPG`,
    `${numericPrefix}.JPEG`,
    `${numericPrefix}.PNG`,
    `${numericPrefix}.WEBP`,
    `${numericPrefix}.GIF`,
  ]

  for (const fallbackName of fallbackCandidates) {
    const publicPath = path.join(
      process.cwd(),
      "public",
      "images",
      "mini-gt",
      folderKey,
      fallbackName
    )
    try {
      fileBuffer = await fs.readFile(publicPath)
      resolvedName = fallbackName.toLowerCase()
      break
    } catch {
      // continue
    }
  }

  return { fileBuffer, resolvedName }
}

/**
 * Public image proxy — supports:
 * - /api/catalog/image/MGT00009/1.jpg (legacy Mini GT)
 * - /api/catalog/image/{brandSlug}/{folderKey}/{fileName}
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params
    const resolved = resolveImagePath(pathSegments)

    if (!resolved) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 })
    }

    const { brandSlug, folderKey, fileName, isChase } = resolved
    const storagePath = getStoragePath(brandSlug, folderKey, fileName, isChase)

    const supabase = await createServerSupabaseClient()
    const { data: downloadedFile, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath)

    if (!downloadError && downloadedFile) {
      const arrayBuffer = await downloadedFile.arrayBuffer()
      return new NextResponse(new Uint8Array(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": getMimeType(fileName),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }

    if (brandSlug !== "mini-gt") {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const { fileBuffer, resolvedName } = await loadLocalMiniGtFallback(folderKey, fileName)
    if (!fileBuffer) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": getMimeType(resolvedName),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }
}
