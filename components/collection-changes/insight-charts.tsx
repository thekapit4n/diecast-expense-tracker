"use client"

import { useEffect, useRef } from "react"
import * as am5 from "@amcharts/amcharts5"
import * as am5xy from "@amcharts/amcharts5/xy"
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated"
import { useTheme } from "next-themes"

/* Chart palette.
 *
 * The app has no chart tokens of its own, so these come from the data-viz
 * reference palette, which is validated for colour-blind separation and for
 * contrast against both surfaces. Two jobs, two ramps:
 *   - reason counts  -> SEQUENTIAL (one blue hue, more-is-darker)
 *   - monthly profit -> DIVERGING (blue above zero, red below, around a
 *                       neutral baseline) because the question is polarity
 * Status greens/reds are deliberately not reused here — they mean state, not
 * quantity, and a profit bar is not a "success".
 */
const PALETTE = {
  light: {
    text: "#52514e",
    grid: "#e6e5e1",
    sequential: ["#0d366b", "#184f95", "#256abf", "#3987e5", "#86b6ef"],
    positive: "#2a78d6",
    negative: "#d03b3b",
  },
  dark: {
    text: "#c3c2b7",
    grid: "#383835",
    sequential: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf"],
    positive: "#3987e5",
    negative: "#e34948",
  },
}

export interface ReasonCount {
  label: string
  count: number
}

export interface MonthProfit {
  month: string
  profit: number
}

function usePalette() {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === "dark" ? PALETTE.dark : PALETTE.light
}

/** Cars that left, by reason. Magnitude comparison across named categories, so
 *  a horizontal bar with one hue — categorical colours would imply the reasons
 *  are series being tracked, which they aren't. */
export function ReasonBarChart({ data }: { data: ReasonCount[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const palette = usePalette()

  useEffect(() => {
    if (!ref.current || data.length === 0) return

    const root = am5.Root.new(ref.current)
    root.setThemes([am5themes_Animated.new(root)])
    /* The small amCharts branding link stays. Their free licence is linkware:
     * hiding or disposing the logo is only allowed under a paid licence. */

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
        paddingRight: 16,
      })
    )

    const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 20 })
    yRenderer.grid.template.set("visible", false)
    yRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "label",
        renderer: yRenderer,
      })
    )

    const xRenderer = am5xy.AxisRendererX.new(root, { strokeOpacity: 0 })
    xRenderer.grid.template.setAll({ stroke: am5.color(palette.grid), strokeOpacity: 1 })
    xRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        renderer: xRenderer,
        /* Counts are whole cars — a "2.5 cars" tick would be nonsense. */
        maxPrecision: 0,
      })
    )

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Cars",
        xAxis,
        yAxis,
        valueXField: "count",
        categoryYField: "label",
        tooltip: am5.Tooltip.new(root, {
          labelText: "{categoryY}: {valueX} car(s)",
        }),
      })
    )

    series.columns.template.setAll({
      height: am5.percent(58),
      cornerRadiusTR: 4,
      cornerRadiusBR: 4,
      strokeOpacity: 0,
    })

    /* More-is-darker: the ramp is applied by rank, not by category identity,
     * which is what makes it sequential rather than categorical. */
    const sorted = [...data].sort((a, b) => b.count - a.count)
    series.columns.template.adapters.add("fill", (_fill, target) => {
      const item = target.dataItem?.dataContext as ReasonCount | undefined
      const rank = item ? sorted.findIndex((d) => d.label === item.label) : 0
      return am5.color(palette.sequential[Math.min(rank, palette.sequential.length - 1)])
    })

    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 1,
        sprite: am5.Label.new(root, {
          text: "{valueX}",
          centerY: am5.p50,
          centerX: am5.p0,
          paddingLeft: 8,
          fontSize: 12,
          fill: am5.color(palette.text),
          populateText: true,
        }),
      })
    )

    yAxis.data.setAll(sorted)
    series.data.setAll(sorted)
    series.appear(800)
    chart.appear(800)

    return () => root.dispose()
  }, [data, palette])

  return <div ref={ref} className="h-[260px] w-full" />
}

/** Profit per month from sales. The question is polarity — did this month make
 *  or lose money — so the bars diverge around a zero baseline. */
export function ProfitColumnChart({ data }: { data: MonthProfit[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const palette = usePalette()

  useEffect(() => {
    if (!ref.current || data.length === 0) return

    const root = am5.Root.new(ref.current)
    root.setThemes([am5themes_Animated.new(root)])
    /* The small amCharts branding link stays. Their free licence is linkware:
     * hiding or disposing the logo is only allowed under a paid licence. */

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
      })
    )

    const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 40 })
    xRenderer.grid.template.set("visible", false)
    xRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, { categoryField: "month", renderer: xRenderer })
    )

    const yRenderer = am5xy.AxisRendererY.new(root, { strokeOpacity: 0 })
    yRenderer.grid.template.setAll({ stroke: am5.color(palette.grid), strokeOpacity: 1 })
    yRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: yRenderer })
    )

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Profit",
        xAxis,
        yAxis,
        valueYField: "profit",
        categoryXField: "month",
        tooltip: am5.Tooltip.new(root, { labelText: "{categoryX}: RM {valueY}" }),
      })
    )

    series.columns.template.setAll({
      width: am5.percent(52),
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      strokeOpacity: 0,
    })

    /* Losing months point down and take the opposite pole; the rounded corners
     * follow, so the flat end always sits on the baseline. */
    series.columns.template.adapters.add("fill", (fill, target) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return am5.color(item && item.profit < 0 ? palette.negative : palette.positive)
    })
    series.columns.template.adapters.add("cornerRadiusTL", (r, target) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return item && item.profit < 0 ? 0 : 4
    })
    series.columns.template.adapters.add("cornerRadiusTR", (r, target) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return item && item.profit < 0 ? 0 : 4
    })
    series.columns.template.adapters.add("cornerRadiusBL", (r, target) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return item && item.profit < 0 ? 4 : 0
    })
    series.columns.template.adapters.add("cornerRadiusBR", (r, target) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return item && item.profit < 0 ? 4 : 0
    })

    xAxis.data.setAll(data)
    series.data.setAll(data)
    series.appear(800)
    chart.appear(800)

    return () => root.dispose()
  }, [data, palette])

  return <div ref={ref} className="h-[260px] w-full" />
}
