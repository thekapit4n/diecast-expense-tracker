import { notFound } from "next/navigation"
import { ChangeList } from "@/components/collection-changes/change-list"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { tw } from "@/lib/theme/diecast-theme"
import { DISPOSAL_ROUTES, disposalRouteBySlug } from "@/lib/disposal"

export function generateStaticParams() {
  return DISPOSAL_ROUTES.map((r) => ({ reason: r.slug }))
}

export default async function CollectionChangePage({
  params,
}: {
  params: Promise<{ reason: string }>
}) {
  const { reason } = await params
  const route = disposalRouteBySlug(reason)
  if (!route) notFound()

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div>
        <h1 className={tw.pageHeading}>{route.label}</h1>
        <p className="text-muted-foreground">{route.blurb}</p>
      </div>

      <ChangeList route={route} />
    </div>
  )
}
