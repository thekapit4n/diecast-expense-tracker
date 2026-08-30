import { InsightView } from "@/components/collection-changes/insight-view"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { tw } from "@/lib/theme/diecast-theme"

/* A static segment, so it wins over the sibling [reason] route — "insight" is
 * never treated as a disposal reason. */
export default function CollectionChangesInsightPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div>
        <h1 className={tw.pageHeading}>Insight</h1>
        <p className="text-muted-foreground">
          Everything that has left your collection, and what the sales made
        </p>
      </div>

      <InsightView />
    </div>
  )
}
