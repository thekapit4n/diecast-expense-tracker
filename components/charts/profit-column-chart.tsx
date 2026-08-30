"use client"

import { useEffect, useRef } from "react"
import * as am5 from "@amcharts/amcharts5"
import * as am5xy from "@amcharts/amcharts5/xy"
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated"
import { useTheme } from "next-themes"
import { CHART_PALETTE } from "@/lib/chart-palette"

export interface MonthProfit {
  month: string
  profit: number
}

/** Profit per month. The question is polarity — did this month make or lose
 *  money — so the bars diverge around a zero baseline with a warm/cool pair
 *  rather than sharing one hue. */
export function ProfitColumnChart({ data }: { data: MonthProfit[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === "dark" ? CHART_PALETTE.dark : CHART_PALETTE.light

  useEffect(() => {
    if (!ref.current || data.length === 0) return

    const root = am5.Root.new(ref.current)
    root.setThemes([am5themes_Animated.new(root)])
    /* The amCharts branding link stays — free licence is linkware. */

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
    yRenderer.grid.template.setAll({
      stroke: am5.color(palette.grid),
      strokeOpacity: 1,
    })
    yRenderer.labels.template.setAll({ fontSize: 12, fill: am5.color(palette.text) })

    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: yRenderer }))

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
      strokeOpacity: 0,
    })

    const isLoss = (target: am5.Sprite) => {
      const item = target.dataItem?.dataContext as MonthProfit | undefined
      return !!item && item.profit < 0
    }

    series.columns.template.adapters.add("fill", (_fill, target) =>
      am5.color(isLoss(target) ? palette.negative : palette.positive)
    )
    /* Round only the free end, so the flat edge always sits on the baseline —
     * losing months hang below it. */
    series.columns.template.adapters.add("cornerRadiusTL", (_r, t) => (isLoss(t) ? 0 : 4))
    series.columns.template.adapters.add("cornerRadiusTR", (_r, t) => (isLoss(t) ? 0 : 4))
    series.columns.template.adapters.add("cornerRadiusBL", (_r, t) => (isLoss(t) ? 4 : 0))
    series.columns.template.adapters.add("cornerRadiusBR", (_r, t) => (isLoss(t) ? 4 : 0))

    xAxis.data.setAll(data)
    series.data.setAll(data)
    series.appear(800)
    chart.appear(800)

    return () => root.dispose()
  }, [data, palette])

  return <div ref={ref} className="h-[260px] w-full" />
}
