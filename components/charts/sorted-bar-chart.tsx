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
  display: string
  tooltip: string
}

/** Horizontal bars, biggest at the top.
 *
 *  Sorted descending because the reader's question is "which is biggest" — a
 *  chart in arbitrary category order makes that a hunt. One hue stepped by
 *  rank keeps it a magnitude comparison; a colour per bar would imply the
 *  categories are series being tracked against each other, which they aren't.
 *
 *  The sort is done the way amCharts' own sorted-bar demo does it: the data
 *  keeps whatever order it arrived in, and each axis item is *shifted* into
 *  its ranked position via `deltaPosition`, animating as it goes. That means
 *  the bars visibly settle into order on load, and re-order rather than jump
 *  when the numbers change under a refresh.
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
          display: formatValue(d.value),
          tooltip: sub
            ? `${d.label}: ${formatValue(d.value)}\n${sub}`
            : `${d.label}: ${formatValue(d.value)}`,
        }
      }),
    [data, formatValue, formatSubLabel]
  )

  /* Rank lookup for the colour ramp. Mirrored into a ref so the fill adapter,
   * registered once when the chart is built, reads current ranks instead of
   * closing over the first render's data. The ref is seeded with the initial
   * value so the very first paint is already correct. */
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

  /* Build once per theme. A theme flip rebuilds rather than restyling every
   * template in place — it is rare and a rebuild is far less to get wrong. */
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
        paddingRight: 24,
        paddingTop: 8,
      })
    )

    /* inversed: a Y category axis draws its first item at the BOTTOM by
     * default, which would put the top-ranked bar at the bottom. */
    const yRenderer = am5xy.AxisRendererY.new(root, {
      minGridDistance: 16,
      inversed: true,
    })
    yRenderer.grid.template.set("visible", false)
    yRenderer.labels.template.setAll({
      fontSize: 12,
      fill: am5.color(palette.text),
      /* Brand names vary a lot in length; truncate rather than let one long
       * name squeeze the plot area. The full name is in the tooltip. */
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
      /* Hovering anywhere along the row hits the bar, not just the filled
       * part, so short bars are no harder to hover than long ones. */
      tooltipX: am5.percent(100),
    })

    /* Lift the hovered bar so it reads as the one being described. */
    series.columns.template.states.create("hover", { fillOpacity: 0.75 })

    series.columns.template.adapters.add("fill", (fill, target) => {
      const item = target.dataItem?.dataContext as ChartRow | undefined
      const ramp = palette.sequential
      const rank = item ? rankRef.current.get(item.label) ?? 0 : 0
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

    seriesRef.current = series
    yAxisRef.current = yAxis

    return () => {
      root.dispose()
      seriesRef.current = null
      yAxisRef.current = null
    }
  }, [palette, integerAxis])

  /* Feed data in its arrival order, then animate each row into rank order. */
  useEffect(() => {
    const series = seriesRef.current
    const yAxis = yAxisRef.current
    if (!series || !yAxis || rows.length === 0) return

    yAxis.data.setAll(rows)
    series.data.setAll(rows)

    const sortAxis = () => {
      const items = [...series.dataItems].sort(
        (a, b) => (b.get("valueX") ?? 0) - (a.get("valueX") ?? 0)
      )

      yAxis.dataItems.forEach((axisItem) => {
        const category = axisItem.get("category")
        const match = items.find((s) => s.get("categoryY") === category)
        if (!match) return

        const index = items.indexOf(match)
        /* How far this row has to travel, as a fraction of the axis. Setting
         * the offset and animating it back to zero moves the row from where
         * it was drawn to where its rank says it belongs. */
        const delta = (index - (axisItem.get("index") ?? 0)) / items.length
        axisItem.set("index", index)
        axisItem.set("deltaPosition", -delta)
        axisItem.animate({
          key: "deltaPosition",
          to: 0,
          duration: 700,
          easing: am5.ease.out(am5.ease.cubic),
        })
      })

      yAxis.dataItems.sort((a, b) => (a.get("index") ?? 0) - (b.get("index") ?? 0))
    }

    /* One frame after the data lands, so the axis has built its items. */
    const raf = requestAnimationFrame(sortAxis)
    series.appear(700)

    return () => cancelAnimationFrame(raf)
  }, [rows])

  if (rows.length === 0) return null

  return <div ref={ref} style={{ height: resolvedHeight }} className="w-full" />
}
