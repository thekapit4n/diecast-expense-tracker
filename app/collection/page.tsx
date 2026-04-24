import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CollectionGrid } from "@/components/collection/collection-grid"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PackageSearch } from "lucide-react"

export default function CollectionPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
        <p className="text-muted-foreground">
          View and manage your diecast collection
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Mini GT Catalog View</CardTitle>
            <CardDescription>
              Browse your owned Mini GT models in dedicated catalog-style cards.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/collection/mini-gt">
              <PackageSearch className="mr-2 h-4 w-4" />
              Open Mini GT Page
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Collection Items</CardTitle>
          <CardDescription>
            Complete list of your diecast collection with sorting, filtering, and pagination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionGrid />
        </CardContent>
      </Card>
    </div>
  )
}
