export const STORAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || "diecast-images"
export const MAX_UPLOAD_IMAGES = 12
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MIN_UPLOAD_IMAGE_BYTES = 1024
export const DEFAULT_CATALOG_IMAGE_SLOTS = 5

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const

export function slugifyBrandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getBrandStorageSlug(brandName: string): string {
  const normalizedBrand = brandName.trim().toLowerCase()
  if (normalizedBrand.includes("mini gt")) {
    return "mini-gt"
  }
  return slugifyBrandName(brandName)
}

export function sanitizeFolderKey(itemNo: string, brandName: string): string | null {
  const normalized = itemNo.trim().toUpperCase()
  if (!normalized) return null

  const isMiniGt = brandName.trim().toLowerCase().includes("mini gt")
  if (isMiniGt) {
    const match = normalized.match(/MGT\d{5}/)
    return match ? match[0] : null
  }

  const cleaned = normalized
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!cleaned || cleaned.length > 64) return null
  if (!/^[A-Z0-9][A-Z0-9-]{0,63}$/.test(cleaned)) return null
  return cleaned
}

export function sanitizeFolderKeyFromName(collectionName: string): string | null {
  const cleaned = collectionName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!cleaned || cleaned.length > 64) return null
  if (!/^[A-Z0-9][A-Z0-9-]{0,63}$/.test(cleaned)) return null
  return cleaned
}

export function resolveFolderKey(options: {
  itemNo?: string | null
  collectionName?: string | null
  brandName: string
}): { folderKey: string; source: "item_no" | "name" } | null {
  const itemKey = options.itemNo?.trim()
    ? sanitizeFolderKey(options.itemNo, options.brandName)
    : null
  if (itemKey) {
    return { folderKey: itemKey, source: "item_no" }
  }

  const nameKey = options.collectionName?.trim()
    ? sanitizeFolderKeyFromName(options.collectionName)
    : null
  if (nameKey) {
    return { folderKey: nameKey, source: "name" }
  }

  return null
}

export function isSafeBrandSlug(brandSlug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brandSlug)
}

export function isSafeFolderKey(folderKey: string, brandSlug: string): boolean {
  if (brandSlug === "mini-gt" && /^MGT\d{5}$/i.test(folderKey)) {
    return true
  }
  return /^[A-Z0-9][A-Z0-9-]{0,63}$/.test(folderKey)
}

export function isSafeFileName(fileName: string): boolean {
  return /^\d+\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)
}

export function getStoragePath(brandSlug: string, folderKey: string, fileName: string): string {
  const safeFolderKey = brandSlug === "mini-gt" ? folderKey.toUpperCase() : folderKey
  return `${brandSlug}/${safeFolderKey}/${fileName.toLowerCase()}`
}

export function buildCatalogImageUrl(brandSlug: string, folderKey: string, fileName: string): string {
  const safeFolderKey = brandSlug === "mini-gt" ? folderKey.toUpperCase() : folderKey
  return `/api/catalog/image/${brandSlug}/${safeFolderKey}/${fileName.toLowerCase()}`
}

export function stripImageCacheVersion(url: string): string {
  const [path, query = ""] = url.split("?", 2)
  if (!query) return path

  const params = query
    .split("&")
    .filter((part) => part && !part.startsWith("v="))
  return params.length > 0 ? `${path}?${params.join("&")}` : path
}

/**
 * Append a stable cache-bust token. Re-use the same version until images change
 * so browsers can still cache responses between visits.
 */
export function appendImageCacheVersion(url: string, version: number | string | null | undefined): string {
  if (version == null || version === "") return url
  const base = stripImageCacheVersion(url)
  const separator = base.includes("?") ? "&" : "?"
  return `${base}${separator}v=${version}`
}

export function extractRemarkImageUrls(remark: string | null): string[] {
  if (!remark) return []
  const matches = remark.match(
    /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)|\/api\/[^\s]+\.(?:jpg|jpeg|png|webp|gif))/gi
  )
  if (!matches) return []

  return matches.map((url) =>
    url.replace(/^\/api\/mini-gt\/image\//, "/api/catalog/image/")
  )
}

export function getMiniGtSeriesImageUrls(
  itemNo: string | null,
  maxSlots: number = DEFAULT_CATALOG_IMAGE_SLOTS
): string[] {
  if (!itemNo) return []
  const normalized = itemNo.trim().toUpperCase()
  const series = normalized.match(/MGT\d+/)?.[0] || normalized
  if (!/^MGT\d{5}$/.test(series)) return []

  return Array.from({ length: maxSlots }, (_, index) =>
    `/api/catalog/image/${series}/${index + 1}.jpg`
  )
}

export function hasCatalogImages(options: {
  brandName: string
  itemNo: string | null
  collectionName?: string | null
  remark: string | null
}): boolean {
  if (extractRemarkImageUrls(options.remark).length > 0) {
    return true
  }

  const isMiniGt = options.brandName.trim().toLowerCase().includes("mini gt")
  if (isMiniGt && options.itemNo) {
    const normalized = options.itemNo.trim().toUpperCase()
    const series = normalized.match(/MGT\d+/)?.[0] || normalized
    if (/^MGT\d{5}$/.test(series)) {
      return true
    }
  }

  return false
}

export function buildCatalogSearchTerm(itemNo: string | null, collectionName: string): string {
  const normalizedItemNo = itemNo?.trim()
  if (normalizedItemNo) return normalizedItemNo
  return collectionName.trim()
}

/**
 * Probable catalog image URLs from Supabase storage layout (item no or model name folder).
 */
export function getBrandStorageImageUrls(
  brandName: string,
  itemNo: string | null,
  collectionName: string | null,
  maxSlots: number = DEFAULT_CATALOG_IMAGE_SLOTS
): string[] {
  const resolved = resolveFolderKey({
    itemNo,
    collectionName,
    brandName,
  })
  if (!resolved) return []

  const brandSlug = getBrandStorageSlug(brandName)
  return Array.from({ length: maxSlots }, (_, index) =>
    buildCatalogImageUrl(brandSlug, resolved.folderKey, `${index + 1}.jpg`)
  )
}

export function mergeCatalogImageUrls(...groups: string[][]): string[] {
  return [...new Set(groups.flat())]
}

export function buildCatalogItemImageUrls(options: {
  remark: string | null
  brandName: string
  itemNo: string | null
  collectionName: string
  imageVersion?: number | null
}): string[] {
  const urls = mergeCatalogImageUrls(
    extractRemarkImageUrls(options.remark),
    getBrandStorageImageUrls(options.brandName, options.itemNo, options.collectionName),
    getMiniGtSeriesImageUrls(options.itemNo)
  )

  if (options.imageVersion == null) {
    return urls
  }

  return urls.map((url) => appendImageCacheVersion(url, options.imageVersion))
}

export function getMimeType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".gif")) return "image/gif"
  return "image/jpeg"
}

export function getExtensionFromMimeType(contentType: string): string {
  const normalized = contentType.toLowerCase()
  if (normalized.includes("png")) return ".png"
  if (normalized.includes("webp")) return ".webp"
  if (normalized.includes("gif")) return ".gif"
  return ".jpg"
}

export function getExtensionFromFileName(fileName: string): string | null {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
  return ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number]) ? ext : null
}

export function mergeRemarkImageUrls(existingRemark: string | null, newUrls: string[]): string {
  const existingLines = (existingRemark || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return [...new Set([...existingLines, ...newUrls])].join("\n")
}

export function getNextImageIndex(
  remark: string | null,
  brandSlug: string,
  folderKey: string
): number {
  const prefixes = [
    `/api/catalog/image/${brandSlug}/${folderKey}/`,
    `/api/catalog/image/${folderKey}/`,
    `/api/mini-gt/image/${folderKey}/`,
  ]

  const indices = (remark || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const prefix = prefixes.find((candidate) => line.includes(candidate))
      if (!prefix) return []
      const fileSegment = line.slice(line.indexOf(prefix) + prefix.length).split(/[?#\s]/)[0]
      const match = fileSegment.match(/^(\d+)\./i)
      return match ? [Number.parseInt(match[1], 10)] : []
    })

  if (indices.length === 0) return 1
  return Math.max(...indices) + 1
}
