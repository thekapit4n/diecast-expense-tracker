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
  /** How a value reads in the hover tooltip. Values are hover-only — printing
   *  them on every bar competed with the bars themselves for attention. */
  formatValue: (value: number) => string
  /** Optional extra detail in the tooltip, e.g. a share of the total. */
  formatSubLabel?: (datum: SortedBarDatum) => string | null
  /** Whole-number axis ticks — counts have no half units. */
  integerAxis?: boolean
  /** Fixed height. Omit to size from the row count. */
  height?: number
  rowHeight?: number
  minHeight?: number
}

interface ChartRow {
  label: string
  value: number
  tooltip: string
}

/** Horizontal bars, biggest at the top, animating into rank order.
 *
 *  Follows amCharts' own sorted-bar demo: the data keeps its arrival order and
 *  each axis item is *shifted* into its ranked position via `deltaPosition`,
 *  which is then animated back to zero. The row order changes instantly while
 *  the bars glide, so they slide past each other instead of jumping.
 *
 *  Two things follow the demo exactly rather than being reasoned from scratch,
 *  because they are what makes the animation land correctly:
 *  `maxDeviation: 0` on both axes (otherwise the axis over-scrolls mid-slide),
 *  and the ascending value sort against a normal — not inversed — axis, which
 *  puts the largest bar at the top.
 *
 *  Colour is the one deliberate departure. The demo gives every bar its own
 *  hue; here it is a single hue stepped by rank, because these bars are one
 *  quantity measured across categories, not separate series to tell apart —
 *  and per-bar hues stop being distinguishable past about seven brands.
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

  const rows: ChartRow[] = useMemo(
    () =>
      data.map((d) => {
        const sub = formatSubLabel?.(d)
        return {
          label: d.label,
          value: d.value,
          tooltip: sub
            ? `[bold]${d.label}[/]\n${formatValue(d.value)} · ${sub}`
            : `[bold]${d.label}[/]\n${formatValue(d.value)}`,
        }
      }),
    [data, formatValue, formatSubLabel]
  )

  /* Rank lookup for the colour ramp. Mirrored into a ref so the fill adapter,
   * registered once when the chart is built, reads current ranks rather than
   * closing over the first render's data. Seeded so the first paint is right. */
  const rankMap = useMemo(() => {
    const map = new Map<string, number>()
    ;[...data]
      .sort((a, b) => b.value - a.value)
      .forEach((d, i) => map.set(d.label, i))
    return map
  }, [data])

  const rankRef = useRef(rankMap)

  /* Declared before the build and data effects so it has already run by the
   * time either of them redraws the columns. */
  useEffect(() => {
    rankRef.current = rankMap
  }, [rankMap])

  const seriesRef = useRef<am5xy.ColumnSeries | null>(null)
  const yAxisRef = useRef<am5xy.CategoryAxis<am5xy.AxisRenderer> | null>(null)

  const resolvedHeight =
    height ?? Math.max(minHeight, rows.length * rowHeight + 48)

  /* Built once per theme. A theme flip rebuilds rather than restyling every
   * template in place — it is rare, and a rebuild is far less to get wrong. */
  useEffect(() => {
    if (!ref.current) return

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
        paddingTop: 8,
      })
    )

    /* The zoom-out button pops in while rows are sliding; hide it. */
    chart.zoomOutButton.set("forceHidden", true)

    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 16 })
    yRenderer.grid.template.set("location", 1)
    yRenderer.grid.template.set("visible", false)
    yRenderer.labels.template.setAll({
      fontSize: 12,
      fill: am5.color(palette.text),
      /* Brand names vary a lot in length; truncate rather than let one long
       * name squeeze the plot area. The full name is in the tooltip. */
      maxWidth: 130,
      oversizedBehavior: "truncate",
    })

    const axisTooltip = am5.Tooltip.new(root, { themeTags: ["axis"] })
    axisTooltip.label.setAll({ fontSize: 10 })

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        maxDeviation: 0,
        categoryField: "label",
        renderer: yRenderer,
        tooltip: axisTooltip,
      })
    )

    const xRenderer = am5xy.AxisRendererX.new(root, {
      strokeOpacity: 0,
      minGridDistance: 80,
    })
    xRenderer.grid.template.setAll({
      stroke: am5.color(palette.grid),
      strokeOpacity: 1,
    })
    xRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        maxDeviation: 0,
        min: 0,
        /* A little headroom so the longest bar does not run into the edge. */
        extraMax: 0.05,
        renderer: xRenderer,
        ...(integerAxis ? { maxPrecision: 0 } : {}),
      })
    )

    const seriesTooltip = am5.Tooltip.new(root, {
      pointerOrientation: "left",
      labelText: "{tooltip}",
    })
    seriesTooltip.label.setAll({ fontSize: 10 })

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueXField: "value",
        categoryYField: "label",
        tooltip: seriesTooltip,
      })
    )

    series.columns.template.setAll({
      height: am5.percent(62),
      cornerRadiusTR: 4,
      cornerRadiusBR: 4,
      strokeOpacity: 0,
    })

    series.columns.template.states.create("hover", { fillOpacity: 0.75 })

    series.columns.template.adapters.add("fill", (fill, target) => {
      const item = target.dataItem?.dataContext as ChartRow | undefined
      const ramp = palette.sequential
      const rank = item ? rankRef.current.get(item.label) ?? 0 : 0
      return am5.color(ramp[Math.min(rank, ramp.length - 1)])
    })

    /* behavior "none": the cursor is there to drive the hover tooltip, not to
     * select or zoom a range. */
    chart.set(
      "cursor",
      am5xy.XYCursor.new(root, { behavior: "none", xAxis, yAxis })
    )

    seriesRef.current = series
    yAxisRef.current = yAxis

    return () => {
      root.dispose()
      seriesRef.current = null
      yAxisRef.current = null
    }
  }, [palette, integerAxis])

  /* Feed data in arrival order, then slide each row into rank order. */
  useEffect(() => {
    const series = seriesRef.current
    const yAxis = yAxisRef.current
    if (!series || !yAxis || rows.length === 0) return

    yAxis.data.setAll(rows)
    series.data.setAll(rows)

    /* Ascending against a normal axis: the first item sits at the bottom, so
     * the smallest lands at the bottom and the largest at the top. */
    series.dataItems.sort((x, y) => (x.get("valueX") ?? 0) - (y.get("valueX") ?? 0))

    yAxis.dataItems.forEach((axisItem) => {
      const category = axisItem.get("category")
      const seriesItem = series.dataItems.find((s) => s.get("categoryY") === category)
      if (!seriesItem) return

      const index = series.dataItems.indexOf(seriesItem)
      const delta = (index - (axisItem.get("index") ?? 0)) / series.dataItems.length
      axisItem.set("index", index)
      /* Offset it instantly, then animate the offset away: the row order
       * changes at once while the bar glides to its new place. */
      axisItem.set("deltaPosition", -delta)
      axisItem.animate({
        key: "deltaPosition",
        to: 0,
        duration: 1000,
        easing: am5.ease.out(am5.ease.cubic),
      })
    })

    yAxis.dataItems.sort((x, y) => (x.get("index") ?? 0) - (y.get("index") ?? 0))

    series.appear(1000)
  }, [rows])

  if (rows.length === 0) return null

  return <div ref={ref} style={{ height: resolvedHeight }} className="w-full" />
}
