"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { tw } from "@/lib/theme/diecast-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { BrandCombobox } from "@/components/ui/brand-combobox"
import { CollectionCombobox, type CollectionOption } from "@/components/ui/collection-combobox"
import { filterCollectionsBySearch } from "@/lib/collection-search"
import { getBrandStorageSlug, resolveFolderKey } from "@/lib/collection-images"
import { toast } from "sonner"
import { Globe, ImagePlus, Loader2, Upload, X } from "lucide-react"

interface BrandOption {
  id: number
  name: string
  type: string
}

interface UploadResult {
  brandSlug: string
  folderKey: string
  folderKeySource: "item_no" | "name"
  uploadedCount: number
  imageUrls: string[]
  linkedCollection: boolean
}

export default function ImageImportPage() {
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [brands, setBrands] = useState<BrandOption[]>([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)

  const [series, setSeries] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [miniGtResult, setMiniGtResult] = useState<null | {
    series: string
    importedCount: number
    imageUrls: string[]
  }>(null)

  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [collectionNameInput, setCollectionNameInput] = useState("")
  const [itemNo, setItemNo] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const selectedBrand = brands.find((brand) => brand.id.toString() === selectedBrandId)
  const isMiniGtBrand = (selectedBrand?.name || "").toLowerCase().includes("mini gt")
  const brandStorageSlug = selectedBrand ? getBrandStorageSlug(selectedBrand.name) : ""

  const resolvedFolder = useMemo(() => {
    if (!selectedBrand) return null
    return resolveFolderKey({
      itemNo: itemNo || null,
      collectionName: collectionNameInput || null,
      brandName: selectedBrand.name,
    })
  }, [selectedBrand, itemNo, collectionNameInput])

  const filteredCollections = useMemo(() => {
    const filtered = filterCollectionsBySearch(collections, collectionNameInput)

    if (!selectedCollectionId) {
      return filtered
    }

    const selected = collections.find((collection) => collection.id === selectedCollectionId)
    if (!selected || filtered.some((collection) => collection.id === selectedCollectionId)) {
      return filtered
    }

    return [selected, ...filtered]
  }, [collections, collectionNameInput, selectedCollectionId])

  const previewUrls = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles]
  )

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  useEffect(() => {
    const loadBrands = async () => {
      setIsLoadingBrands(true)
      try {
        const { data, error } = await supabase
          .from("tbl_master_brand")
          .select("id, name, type")
          .eq("isactive", 1)
          .eq("type", "Diecast")
          .order("name")

        if (error) throw error
        setBrands((data || []) as BrandOption[])
      } catch (error) {
        console.error("Failed to load brands:", error)
        toast.error("Failed to load brands")
      } finally {
        setIsLoadingBrands(false)
      }
    }

    loadBrands()
  }, [supabase])

  useEffect(() => {
    if (!selectedBrandId) {
      setCollections([])
      setSelectedCollectionId(null)
      setCollectionNameInput("")
      setItemNo("")
      return
    }

    const loadCollections = async () => {
      setIsLoadingCollections(true)
      try {
        const { data, error } = await supabase
          .from("tbl_collection")
          .select(`
            id,
            name,
            item_no,
            brand_id,
            scale,
            remark,
            tbl_master_brand(name)
          `)
          .eq("brand_id", Number.parseInt(selectedBrandId, 10))
          .order("name")

        if (error) throw error

        const formatted: CollectionOption[] = (data || []).map((row: Record<string, unknown>) => {
          const brandJoin = row.tbl_master_brand as { name?: string } | { name?: string }[] | null
          const brandName = Array.isArray(brandJoin)
            ? brandJoin[0]?.name
            : brandJoin?.name

          return {
            id: String(row.id),
            name: String(row.name),
            item_no: (row.item_no as string | null) ?? null,
            brand_id: Number(row.brand_id),
            brand_name: brandName || selectedBrand?.name || "Unknown",
            scale: (row.scale as string | null) ?? null,
            remark: (row.remark as string | null) ?? null,
          }
        })

        setCollections(formatted)
      } catch (error) {
        console.error("Failed to load collections:", error)
        toast.error("Failed to load collections for this brand")
      } finally {
        setIsLoadingCollections(false)
      }
    }

    loadCollections()
  }, [selectedBrandId, supabase, selectedBrand?.name])

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId)
    setSelectedCollectionId(null)
    setCollectionNameInput("")
    setItemNo("")
    setUploadResult(null)
  }

  const handleCollectionSelect = (collection: CollectionOption | null) => {
    if (collection) {
      setSelectedCollectionId(collection.id)
      setCollectionNameInput(collection.name)
      setItemNo(collection.item_no || "")
    } else {
      setSelectedCollectionId(null)
    }
    setUploadResult(null)
  }

  const handleMiniGtImport = async () => {
    if (!series.trim() || !productUrl.trim()) {
      toast.error("Series and product URL are required")
      return
    }

    setIsImporting(true)
    setMiniGtResult(null)

    try {
      const response = await fetch("/api/management/mini-gt-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: series.trim(),
          productUrl: productUrl.trim(),
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || "Import failed")
        return
      }

      setMiniGtResult(payload)
      toast.success(`Imported ${payload.importedCount} images for ${payload.series}`)
    } catch (error) {
      console.error("Image import failed:", error)
      toast.error("Unexpected import error")
    } finally {
      setIsImporting(false)
    }
  }

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setSelectedFiles((current) => [...current, ...files])
    setUploadResult(null)
    event.target.value = ""
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
    setUploadResult(null)
  }

  const clearSelectedFiles = () => {
    setSelectedFiles([])
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!selectedBrandId) {
      toast.error("Select a brand")
      return
    }

    if (!resolvedFolder) {
      toast.error(
        isMiniGtBrand
          ? "Enter a series like MGT00009, or select/type the model name"
          : "Enter an item number or select/type the model name"
      )
      return
    }

    if (selectedFiles.length === 0) {
      toast.error("Select at least one image")
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("brandId", selectedBrandId)
      if (selectedCollectionId) {
        formData.append("collectionId", selectedCollectionId)
      }
      if (itemNo.trim()) {
        formData.append("itemNo", itemNo.trim())
      }
      if (collectionNameInput.trim()) {
        formData.append("collectionName", collectionNameInput.trim())
      }
      selectedFiles.forEach((file) => formData.append("files", file))

      const response = await fetch("/api/management/collection-image-upload", {
        method: "POST",
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.error(payload.error || "Upload failed")
        return
      }

      setUploadResult(payload)
      setSelectedFiles([])
      toast.success(`Uploaded ${payload.uploadedCount} image(s) for ${payload.folderKey}`)

      if (!payload.linkedCollection) {
        toast.message(
          "Images saved to storage. No matching collection item was found — check brand and model name."
        )
      }
    } catch (error) {
      console.error("Collection image upload failed:", error)
      toast.error("Unexpected upload error")
    } finally {
      setIsUploading(false)
    }
  }

  const itemNoPlaceholder = useCallback(() => {
    if (isMiniGtBrand) return "MGT00009 or full item number"
    return "TW0001, IN64-0123, etc."
  }, [isMiniGtBrand])

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div>
        <h1 className={tw.pageHeading}>Collection Image Import</h1>
        <p className="text-muted-foreground">
          Upload photos for any brand or import Mini GT images from the official product page.
          Images are stored in Supabase and linked by item number, or by model name when no item
          number exists.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={tw.cardHeading}>Upload Collection Images</CardTitle>
          <CardDescription>
            Select a brand and model. Use item number when available; otherwise the model name is
            used as the storage folder (e.g. Tarmac or Inno64 models without a product code).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <BrandCombobox
                brands={brands}
                value={selectedBrandId}
                onValueChange={handleBrandChange}
                placeholder={isLoadingBrands ? "Loading brands..." : "Search or select brand..."}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model Name</label>
              <CollectionCombobox
                collections={filteredCollections}
                value={selectedCollectionId}
                onValueChange={handleCollectionSelect}
                inputValue={collectionNameInput}
                onInputChange={(value) => {
                  setCollectionNameInput(value)
                  setSelectedCollectionId(null)
                  setUploadResult(null)
                }}
                placeholder={
                  isLoadingCollections ? "Loading models..." : "Search or type model name..."
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Item Number <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={itemNo}
                onChange={(event) => {
                  setItemNo(event.target.value.toUpperCase())
                  setUploadResult(null)
                }}
                placeholder={itemNoPlaceholder()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Storage Preview</label>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {resolvedFolder && selectedBrand ? (
                  <>
                    <span className="font-mono text-foreground">
                      {brandStorageSlug}/{resolvedFolder.folderKey}
                    </span>
                    <span className="mt-1 block text-xs">
                      Using {resolvedFolder.source === "item_no" ? "item number" : "model name"}
                    </span>
                  </>
                ) : (
                  <span>Select brand and enter item number or model name</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Images</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Choose Images
              </Button>
              {selectedFiles.length > 0 ? (
                <Button type="button" variant="ghost" onClick={clearSelectedFiles}>
                  Clear all
                </Button>
              ) : null}
            </div>

            {selectedFiles.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted/20"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                Select one or more images (up to 12 per upload).
              </div>
            )}
          </div>

          <Button onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Image(s)` : "Images"}
              </>
            )}
          </Button>

          {uploadResult ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm">
              <p className="font-medium">Uploaded {uploadResult.uploadedCount} image(s)</p>
              <p className="text-muted-foreground">
                {uploadResult.brandSlug}/{uploadResult.folderKey}
                {" "}
                ({uploadResult.folderKeySource === "item_no" ? "item number" : "model name"})
              </p>
              <p className="text-muted-foreground">
                {uploadResult.linkedCollection
                  ? "Linked to matching collection item."
                  : "Saved to storage only — select the model from your collection to link in catalog."}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={tw.cardHeading}>Mini GT — Import From Product URL</CardTitle>
          <CardDescription>
            Existing Mini GT flow: scrape images from minigt.tsm-models.com. Series format must be
            like MGT00009.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Series</label>
              <Input
                value={series}
                onChange={(event) => setSeries(event.target.value.toUpperCase())}
                placeholder="MGT00009"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product URL</label>
              <Input
                value={productUrl}
                onChange={(event) => setProductUrl(event.target.value)}
                placeholder="https://minigt.tsm-models.com/index.php?action=product-detail&id=9"
              />
            </div>
          </div>

          <Button onClick={handleMiniGtImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Import From URL
              </>
            )}
          </Button>

          {miniGtResult ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm">
              <p className="font-medium">Imported {miniGtResult.importedCount} image(s)</p>
              <p className="text-muted-foreground">Series: {miniGtResult.series}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
