"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AgGridPanelProps {
  children: (popupParent: HTMLElement | undefined) => React.ReactNode
  className?: string
}

/**
 * Wraps AG Grid so filter/menu popups stay inside the themed container.
 */
export function AgGridPanel({ children, className }: AgGridPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [popupParent, setPopupParent] = useState<HTMLElement>()

  useEffect(() => {
    if (containerRef.current) {
      setPopupParent(containerRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("ag-theme-quartz w-full h-[calc(100vh-12rem)]", className)}
    >
      {children(popupParent)}
    </div>
  )
}
