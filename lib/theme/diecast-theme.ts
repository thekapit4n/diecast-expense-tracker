/**
 * Diecast catalog palette.
 *
 * These used to be hex literals mirrored by hand from app/globals.css, which
 * meant they could not follow a theme change: `colors.*` feeds runtime inline
 * styles, and `tw.*` bakes values into Tailwind arbitrary classes. Both now
 * point at the CSS custom properties instead, so light and dark resolve at use
 * site and there is nothing left to keep in sync.
 *
 * The keys and shape are unchanged, so every call site keeps working.
 */

export const colors = {
  surface: {
    page: "var(--background)",
    elevated: "var(--surface-elevated)",
    card: "var(--card)",
    imageGradientFrom: "var(--image-gradient-from)",
    imageGradientTo: "var(--image-gradient-to)",
  },
  border: {
    default: "var(--border)",
    hover: "var(--border-strong)",
    navHeader: "var(--nav-header-border)",
    navClose: "var(--overlay-border)",
    navCloseHover: "var(--overlay-border-hover)",
  },
  text: {
    primary: "var(--foreground)",
    secondary: "var(--text-secondary)",
    muted: "var(--text-muted)",
    faint: "var(--text-faint)",
    title: "var(--title-highlight)",
    section: "var(--text-section)",
    slate: "var(--text-slate)",
    slateLight: "var(--text-slate-light)",
    slateBright: "var(--text-slate-bright)",
    slatePale: "var(--text-slate-pale)",
  },
  accent: {
    default: "var(--primary)",
    hover: "var(--primary-hover)",
    glow: "var(--accent-glow)",
    faint: "var(--accent-faint)",
    separator: "var(--accent-separator)",
    handle: "var(--accent-handle)",
  },
  owned: {
    default: "var(--owned)",
    faint: "var(--owned-faint)",
    border: "var(--owned-border)",
    borderHover: "var(--owned-border-hover)",
    onBadge: "var(--owned-on-badge)",
  },
  nav: {
    activeBg: "var(--nav-badge-bg)",
    activeText: "var(--nav-active)",
    activeIcon: "var(--nav-active-icon)",
    hoverText: "var(--nav-hover-text)",
    hoverBg: "var(--overlay-hover)",
    iconGlow: "var(--nav-icon-glow)",
    badgeBg: "var(--nav-badge-bg)",
    badgeBorder: "var(--nav-badge-border)",
    closeBg: "var(--overlay-hover)",
  },
  semantic: {
    chase: "var(--chase)",
    chaseFaint: "var(--chase-faint)",
    destructive: "var(--destructive)",
    success: "var(--owned)",
    successFaint: "var(--success-faint)",
    warning: "var(--warning)",
  },
} as const

/** Prebuilt Tailwind class bundles — prefer semantic tokens (bg-background) where possible */
export const tw = {
  page: "bg-background text-foreground",
  surfaceElevated: "bg-surface-elevated",
  surfaceCard: "bg-card",
  border: "border-border",
  borderHover: "border-[var(--border-strong)]",
  textPrimary: "text-foreground",
  textSecondary: "text-muted-foreground",
  textMuted: "text-[var(--text-muted)]",
  textFaint: "text-[var(--text-faint)]",
  textTitle: "text-title-highlight",
  pageHeading: "text-3xl font-bold tracking-tight text-title-highlight",
  sectionHeading: "text-lg font-semibold text-title-highlight",
  cardHeading: "text-title-highlight",
  textSection: "text-[var(--text-section)]",
  accent: "text-primary",
  accentBg: "bg-primary",
  accentBgHover: "hover:bg-[var(--primary-hover)]",
  accentBorder: "border-primary",
  accentRing: "ring-primary focus-visible:ring-primary",
  accentBgFaint: "bg-primary/15",
  ownedBorder:
    "border-[var(--owned-border)] hover:border-[var(--owned-border-hover)]",
  ownedBadge: "bg-owned text-[var(--owned-on-badge)]",
  preOrderBorder: "border-amber-500/40 hover:border-amber-500/80",
  preOrderBadge: "bg-amber-500 text-[var(--owned-on-badge)]",
  pillActive:
    "bg-primary text-primary-foreground shadow-[0_0_12px_var(--accent-glow)]",
  pillInactive:
    "border border-border bg-card text-title-highlight hover:border-primary hover:text-title-highlight",
  progressTrack: "h-2 w-full rounded-full border border-border bg-background",
  scrollbarDark:
    "[scrollbar-width:thin] [scrollbar-color:var(--primary)_var(--card)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-card [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-border [&::-webkit-scrollbar-thumb]:bg-primary hover:[&::-webkit-scrollbar-thumb]:bg-[var(--primary-hover)]",
  scrollbarCatalog: "scrollbar-catalog",
  navItemText: "text-title-highlight",
  input:
    "border-border bg-card text-foreground placeholder:text-[var(--text-faint)] focus-visible:ring-primary",
  sheet: "border-border bg-surface-elevated text-foreground",
  headerSticky: "sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md",
  navGroupLabel:
    "mb-1 mt-2 px-2 text-[10px] font-semibold uppercase text-[var(--text-section)] tracking-[0.14em]",
  badgeTeal:
    "border-[var(--nav-badge-border)] bg-[var(--nav-badge-bg)] text-nav-active",
  badgeSuccess: "bg-owned/15 text-owned",
  badgeDestructive: "bg-destructive/15 text-destructive",
  badgeWarning: "bg-amber-500/15 text-amber-400",
  badgeMuted: "bg-muted text-muted-foreground",
  badgePrimary: "bg-primary/15 text-primary",
  badgePaid: "bg-owned/15 text-owned",
  badgeUnpaid: "bg-amber-500/15 text-amber-400",
  badgeRefunded: "bg-destructive/15 text-destructive",
  badgeInactive: "bg-muted text-muted-foreground",
  badgeEditionEvent: "bg-amber-500/15 text-amber-400",
  badgeEditionLtd: "bg-primary/20 text-title-highlight",
  badgeEditionBlack: "bg-foreground/90 text-background",
} as const
