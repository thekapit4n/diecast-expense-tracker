import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Diecast Catalog",
  description: "Browse the diecast collection",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0B0C] text-[#F4F4F5]">
      {children}
    </div>
  )
}
