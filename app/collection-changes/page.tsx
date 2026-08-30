import { redirect } from "next/navigation"

/** The section has no page of its own. Insight is the overview across all
 *  reasons, so the bare URL — which the breadcrumb also links to — lands
 *  there rather than 404ing. */
export default function CollectionChangesIndex() {
  redirect("/collection-changes/insight")
}
