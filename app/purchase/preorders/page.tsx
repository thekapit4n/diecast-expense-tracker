import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { PreorderTracker } from "@/components/purchase/preorder-tracker"

export default function PreordersPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <PreorderTracker />
    </div>
  )
}
