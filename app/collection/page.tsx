import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CollectionGrid } from "@/components/collection/collection-grid"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"

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
