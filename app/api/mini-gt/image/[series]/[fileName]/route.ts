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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ series: string; fileName: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { series, fileName } = await context.params

    if (!isSafeSeries(series) || !isSafeFileName(fileName)) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 })
    }

    const safeSeries = series.toUpperCase()
    const safeName = fileName.toLowerCase()
    const storagePath = getStoragePath(safeSeries, safeName)

    const { data: downloadedFile, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath)

    if (!downloadError && downloadedFile) {
      const arrayBuffer = await downloadedFile.arrayBuffer()
      return new NextResponse(new Uint8Array(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": getMimeType(safeName),
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      })
    }

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
        // continue searching fallback candidates
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": getMimeType(resolvedName),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }
}
