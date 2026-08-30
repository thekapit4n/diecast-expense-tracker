"use client"

import { useEffect, useMemo, useRef } from "react"
import * as am5 from "@amcharts/amcharts5"
import * as am5xy from "@amcharts/amcharts5/xy"
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated"
import { useTheme } from "next-themes"
import { CHART_PALETTE } from "@/lib/chart-palette"

export interface SortedBarDatum {
  label: string
  value: number
}

interface SortedBarChartProps {
  data: SortedBarDatum[]
  /** How a value reads on the bar's end label and in the tooltip. */
  formatValue: (value: number) => string
  /** Optional second line in the tooltip, e.g. a share of the total. */
  formatSubLabel?: (datum: SortedBarDatum) => string | null
  /** Whole-number axis ticks — counts have no half units. */
  integerAxis?: boolean
  /** Fixed height. Omit to size from the row count. */
  height?: number
  rowHeight?: number
  minHeight?: number
}

/** Horizontal bars, biggest at the top.
 *
 *  Sorted descending because the reader's question is "which is biggest" — a
 *  bar chart in arbitrary category order makes that a hunt. One hue stepped by
 *  rank keeps it a magnitude comparison; separate colours per bar would imply
 *  the categories are series being tracked, which they aren't.
 */
export function SortedBarChart({
  data,
  formatValue,
  formatSubLabel,
  integerAxis = false,
  height,
  rowHeight = 34,
  minHeight = 200,
}: SortedBarChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === "dark" ? CHART_PALETTE.dark : CHART_PALETTE.light

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data]
  )

  /* amCharts draws into a fixed-height box, so with many categories the box
   * grows and the parent scrolls — rather than squashing 20 brands into 260px
   * where the labels collide. */
  const resolvedHeight =
    height ?? Math.max(minHeight, sorted.length * rowHeight + 48)

  useEffect(() => {
    if (!ref.current || sorted.length === 0) return

    const root = am5.Root.new(ref.current)
    root.setThemes([am5themes_Animated.new(root)])
    /* The amCharts branding link stays — their free licence is linkware and
     * hiding the logo requires a paid licence. */

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
        paddingRight: 24,
        paddingTop: 8,
      })
    )

    /* inversed: a Y category axis draws its first data item at the BOTTOM by
     * default, which would put the biggest bar at the bottom of a descending
     * sort — the opposite of the point. This flips it so biggest is on top. */
    const yRenderer = am5xy.AxisRendererY.new(root, {
      minGridDistance: 16,
      inversed: true,
    })
    yRenderer.grid.template.set("visible", false)
    yRenderer.labels.template.setAll({
      fontSize: 12,
      fill: am5.color(palette.text),
      /* Brand names vary a lot in length; truncate rather than let a long one
       * push the plot area into nothing. The full name is in the tooltip. */
      maxWidth: 130,
      oversizedBehavior: "truncate",
    })

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "label",
        renderer: yRenderer,
      })
    )

    const xRenderer = am5xy.AxisRendererX.new(root, { strokeOpacity: 0 })
    xRenderer.grid.template.setAll({
      stroke: am5.color(palette.grid),
      strokeOpacity: 1,
    })
    xRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        renderer: xRenderer,
        ...(integerAxis ? { maxPrecision: 0 } : {}),
      })
    )

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueXField: "value",
        categoryYField: "label",
        tooltip: am5.Tooltip.new(root, { labelText: "{tooltip}" }),
      })
    )

    series.columns.template.setAll({
      height: am5.percent(62),
      cornerRadiusTR: 4,
      cornerRadiusBR: 4,
      strokeOpacity: 0,
    })

    /* Ramp by position in the sorted list, so darkest always means biggest. */
    series.columns.template.adapters.add("fill", (_fill, target) => {
      const item = target.dataItem?.dataContext as SortedBarDatum | undefined
      const rank = item ? sorted.findIndex((d) => d.label === item.label) : 0
      const ramp = palette.sequential
      return am5.color(ramp[Math.min(rank, ramp.length - 1)])
    })

    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 1,
        sprite: am5.Label.new(root, {
          text: "{display}",
          centerY: am5.p50,
          centerX: am5.p0,
          paddingLeft: 8,
          fontSize: 12,
          fill: am5.color(palette.text),
          populateText: true,
        }),
      })
    )

    const rows = sorted.map((d) => {
      const sub = formatSubLabel?.(d)
      return {
        label: d.label,
        value: d.value,
        display: formatValue(d.value),
        tooltip: sub
          ? `${d.label}: ${formatValue(d.value)} (${sub})`
          : `${d.label}: ${formatValue(d.value)}`,
      }
    })

    yAxis.data.setAll(rows)
    series.data.setAll(rows)
    series.appear(700)
    chart.appear(700)

    return () => root.dispose()
  }, [sorted, palette, formatValue, formatSubLabel, integerAxis])

  if (sorted.length === 0) return null

  return <div ref={ref} style={{ height: resolvedHeight }} className="w-full" />
}
