# Diecast Catalog — Mobile UI/UX Concept

**Document Type:** UX Design Specification
**Feature:** Public Catalog Page (`/catalog`)
**Date:** 17 May 2026
**Status:** Implemented (initial release)

---

## Summary

This document outlines the mobile-first UI/UX concept for the Diecast Expense Tracker public catalog page.

The goal is to move away from the existing admin-dashboard aesthetic and deliver a premium collector experience — closer in feel to an automotive gallery or trading card showcase than an inventory management system. The catalog is publicly accessible (no login required) and supports multiple diecast brands with a reusable, scalable architecture.

Key design principles:
- **Mobile-first** — vertical phone layout, thumb-friendly navigation, fast browsing
- **Image-first** — large visuals, minimal text clutter, premium dark automotive theme
- **Multi-brand** — dynamically shows only brands with registered collection data
- **Collector-focused** — chase/case indicators, owned quantity, purchase history per model

Features intentionally deferred for a future iteration:
- Share Collection
- Collection Progress / Completion Percentage
- Wishlist System

---

## Overview

This document describes the proposed mobile-first UI/UX concept for the Diecast Expense Tracker catalog page.

The goal of this redesign is NOT to replace the existing desktop/table layout. Instead, this new page will act as a dedicated mobile catalog experience optimized for:

* Mobile browsing
* Standalone catalog usage
* Better visual presentation
* Faster collection navigation
* Better user engagement for collectors
* Support for multiple diecast brands

---

# Design Direction

## Current Problem

The current UI is functional but still feels like:

* Admin dashboard
* Inventory management system
* Enterprise application

For diecast collectors, the experience should feel more like:

* Automotive gallery
* Trading card collection app
* Premium collector showcase
* Car catalog application

---

# Main Design Goals

## 1. Mobile First

The new page should prioritize:

* Vertical phone usage
* Thumb-friendly navigation
* Fast browsing experience
* Lightweight interaction

---

## 2. Image First Experience

Diecast collectors focus heavily on visuals.

The redesign should:

* Prioritize large images
* Reduce text clutter
* Improve visual hierarchy
* Make the collection feel premium

---

## 3. Multi Brand Support

The new UI must support:

* Mini GT
* Pop Race
* Tarmac Works
* Kaido House
* CM Model
* Inno64
* Future brands

The architecture should be reusable and scalable.

---

# Recommended UI Structure

## Main Mobile Layout

```txt
------------------------------------------------
 Diecast Catalog
 120 Models • 6 Brands

 [ Search Models ]

 [ All ] [ Mini GT ] [ Pop Race ]
 [ Tarmac ] [ Kaido ] [ More ]

 [ Owned ] [ Wishlist ] [ Latest ]

 -------------------------------
 | Card | Card |
 | Card | Card |
 | Card | Card |
 -------------------------------

 [ Bottom Navigation ]
------------------------------------------------
```

---

# Recommended Components

## Sticky Header

The header should remain visible while scrolling.

### Content

* Page title
* Total model count
* Search button
* Filter button
* Wishlist shortcut

### Example

```txt
Diecast Catalog
120 Models • 6 Brands
```

---

# Search Experience

## Search Bar

The search should support:

* Model name
* Brand name
* Car manufacturer
* Chassis code
* Tags
* Casting name

### Example

```txt
Search models, brands, castings...
```

---

# Brand Navigation

## Horizontal Slide Tabs

Instead of dropdown menus, use swipeable brand tabs.

### Recommended Behavior

* Swipe left/right
* Tap to filter
* Smooth transition
* Active brand highlight

### Example

```txt
[ All ] [ Mini GT ] [ Pop Race ]
[ Tarmac Works ] [ Kaido House ]
```

---

# Catalog Card Design

## Recommended Layout

```txt
┌──────────────┐
│    Image     │
│              │
├──────────────┤
│ Model Name   │
│ MGT00003     │
│ [Mini GT]    │
└──────────────┘
```

---

# Card Information Hierarchy

## Primary Information

* Large image
* Model name

## Secondary Information

* Model code
* Scale
* Brand

## Metadata Chips

* LBWK
* R35
* GT3
* JDM
* Race
* Street

---

# Recommended Grid Layout

## Mobile

```txt
2 Column Grid
```

### Why

* Faster browsing
* Better visual density
* More catalog feeling
* Better collector experience

---

## Tablet

```txt
3 Column Grid
```

---

## Desktop

```txt
5 Column Grid
```

---

# Card Interaction Flow

## Tap On Card

When user taps the card:

### Recommended Action

Open Bottom Sheet / Bottom Drawer

### Why

* Faster interaction
* Keeps browsing context
* Better mobile UX
* Avoid unnecessary page loading

---

# Bottom Drawer Design

## Content

```txt
Large Image
Model Name
Model Number
Scale
Brand
Tags

[ Wishlist ]
[ Owned ]
[ View Details ]
```

---

# Full Detail Page

If user taps:

```txt
View Details
```

Then navigate to:

```txt
Full model detail page
```

---

# Filter & Sort Sheet

## Recommended Mobile Pattern

Open as fullscreen sheet or bottom sheet.

### Filter Categories

* Brand
* Scale
* Status
* Category
* Manufacturer
* Tag

### Sort Options

* Newest First
* Oldest First
* Name A-Z
* Name Z-A

---

# Collection Statistics

## Recommended Stats Section

```txt
Owned Models
Wishlist Models
Recently Added
Completion Percentage
```

### Example

```txt
55 / 80 Mini GT Models
```

This creates:

* Collector engagement
* Completion motivation
* Gamification feeling

---

# Bottom Navigation

## Recommended Navigation

```txt
[ Home ]
[ Collection ]
[ Purchases ]
[ Wishlist ]
[ Profile ]
```

### Why

Bottom navigation is more mobile-friendly compared to sidebars.

---

# Recommended Color Scheme

## Primary Theme

### Premium Dark Automotive Theme

```txt
Background: #0B0B0C
Card: #16181D
Border: #27272A
Text: #F4F4F5
Secondary Text: #A1A1AA
Accent Red: #FF3B30
Accent Blue: #3B82F6
```

---

# UI Feeling Reference

The UI should feel similar to:

* Automotive gallery
* Premium collectible app
* Gran Turismo garage
* Trading card collection app
* Car showcase platform

NOT:

* Enterprise dashboard
* Spreadsheet management
* Admin panel

---

# Recommended Animations

## Card Hover

```txt
Slight scale increase
Soft shadow glow
Border highlight
```

---

## Brand Slide

```txt
Smooth horizontal scrolling
Snap scrolling
Animated active state
```

---

## Drawer Animation

```txt
Smooth bottom-up animation
Background blur
Swipe down to close
```

---

# Recommended ShadCN Components

## UI Components

* Card
* Badge
* Sheet
* Drawer
* Tabs
* ScrollArea
* Button
* Input
* Skeleton
* Carousel
* Command

---

# Suggested Technical Structure

## Page Structure

```txt
MobileCatalogPage
 ├─ StickyHeader
 ├─ SearchBar
 ├─ BrandTabs
 ├─ QuickStats
 ├─ CatalogGrid
 │   └─ DiecastCard
 ├─ BottomDrawer
 └─ BottomNavigation
```

---

# Recommended User Flow

## Main Flow

```txt
Open App
→ Browse Catalog
→ Slide Brand Tabs
→ Filter/Search
→ Tap Card
→ Open Quick Preview
→ View Details
→ Add To Wishlist / Owned
```

---

# Additional Future Features

## Optional Features

### 1. Wishlist System

Allow users to:

* Save wanted models
* Separate owned vs wanted

---

### 2. Collection Progress

```txt
55 / 300 Models Collected
```

---

### 3. Rare / Chase Indicator

```txt
Common
Rare
Limited
Chase
Event Exclusive
```

---

### 4. Multiple Images

Support:

* Front view
* Rear view
* Box image
* Diorama image

---

### 5. Share Collection

Allow users to:

* Share specific models
* Share collection pages
* Export collection catalog

---

# Summary

This redesign focuses on:

* Mobile-first experience
* Premium collector visual direction
* Faster browsing interaction
* Better image presentation
* Reusable multi-brand architecture
* Better engagement for diecast collectors

The new mobile catalog should feel more like:

```txt
A premium diecast collector showcase
```

instead of:

```txt
An inventory management dashboard
```
