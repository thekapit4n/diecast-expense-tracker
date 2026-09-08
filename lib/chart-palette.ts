/* Chart colours.
 *
 * The app theme has no chart tokens, so these come from a validated
 * data-visualisation palette: checked for colour-blind separation between
 * adjacent steps and for contrast against both the light and dark surfaces.
 * Dark is a selected set of steps for the dark surface, not an automatic flip.
 *
 * Two jobs, two ramps:
 *   sequential — magnitude across categories (spending per brand, cars per
 *                reason). One hue, more-is-darker, applied by RANK so it stays
 *                sequential rather than turning into category identity.
 *   diverging  — polarity around a baseline (monthly profit above/below zero).
 *
 * Status greens and reds are deliberately not reused: those mean state, and a
 * profitable month is not a "success" badge.
 */
export interface ChartPalette {
  text: string
  grid: string
  sequential: string[]
  positive: string
  negative: string
}

export const CHART_PALETTE: { light: ChartPalette; dark: ChartPalette } = {
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
