"use client"

import { useState } from "react"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ImageImportPage() {
  const [series, setSeries] = useState("")
  const [productUrl, setProductUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [latestResult, setLatestResult] = useState<null | {
    series: string
    importedCount: number
    imageUrls: string[]
  }>(null)

  const handleImport = async () => {
    if (!series.trim() || !productUrl.trim()) {
      toast.error("Series and product URL are required")
      return
    }

    setIsImporting(true)
    setLatestResult(null)

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

      setLatestResult(payload)
      toast.success(`Imported ${payload.importedCount} images for ${payload.series}`)
    } catch (error) {
      console.error("Image import failed:", error)
      toast.error("Unexpected import error")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mini GT Image Import</h1>
        <p className="text-muted-foreground">
          Securely import product images into local series folders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import From Product URL</CardTitle>
          <CardDescription>
            Allowed host: minigt.tsm-models.com only. Series format must be like MGT00009.
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

          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Images"
            )}
          </Button>

          {latestResult ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm">
              <p className="font-medium">Imported {latestResult.importedCount} image(s)</p>
              <p className="text-muted-foreground">Series: {latestResult.series}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
