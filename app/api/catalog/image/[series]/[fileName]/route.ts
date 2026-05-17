import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const STORAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || "diecast-images"
const STORAGE_BRAND_PREFIX = "mini-gt"

function getMimeType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  return "image/jpeg"
}

function isSafeSeries(series: string): boolean {
  return /^MGT\d{5}$/i.test(series)
}

function isSafeFileName(fileName: string): boolean {
  return /^\d+\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)
}

function getStoragePath(series: string, fileName: string): string {
  return `${STORAGE_BRAND_PREFIX}/${series}/${fileName}`
}

/**
 * Public image proxy — no auth check so the /catalog public page can display images.
 * Uses the anon key via createServerSupabaseClient; relies on the storage bucket
 * allowing anon reads (or falls back to the local public/images directory).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ series: string; fileName: string }> }
) {
  try {
    const { series, fileName } = await context.params

    if (!isSafeSeries(series) || !isSafeFileName(fileName)) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 })
    }

    const safeSeries = series.toUpperCase()
    const safeName = fileName.toLowerCase()
    const storagePath = getStoragePath(safeSeries, safeName)

    const supabase = await createServerSupabaseClient()
    const { data: downloadedFile, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath)

    if (!downloadError && downloadedFile) {
      const arrayBuffer = await downloadedFile.arrayBuffer()
      return new NextResponse(new Uint8Array(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": getMimeType(safeName),
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }

    /* Fallback: local public/images directory */
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
      const publicPath = path.join(process.cwd(), "public", "images", "mini-gt", safeSeries, fallbackName)
      try {
        fileBuffer = await fs.readFile(publicPath)
        resolvedName = fallbackName.toLowerCase()
        break
      } catch {
        // continue
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": getMimeType(resolvedName),
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }
}
