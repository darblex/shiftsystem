---
name: ShiftSystem
description: Shift & attendance management for Phoenix team — dark-first, Hebrew-first, precise, calm.
colors:
  bg: "#090b12"
  bg-card: "rgba(18, 23, 37, 0.88)"
  bg-elevated: "rgba(27, 35, 54, 0.94)"
  border: "rgba(255, 255, 255, 0.09)"
  border-strong: "rgba(255, 255, 255, 0.16)"
  fg: "#f3f7ff"
  muted: "#9aa7bd"
  phoenix-blue: "#2563eb"
  phoenix-cyan: "#22d3ee"
  phoenix-gold: "#f59e0b"
  phoenix-rose: "#ef4444"
  shift-office: "#f59e0b"
  shift-home: "#3b82f6"
  shift-night: "#a855f7"
  shift-duty: "#ef4444"
  shift-weekend-duty: "#f97316"
  shift-holiday: "#22c55e"
  shift-sick: "#ec4899"
  shift-vacation: "#14b8a6"
  shift-off: "#64748b"
typography:
  display:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 4.5vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: "0.02em"
rounded:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.35rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  btn-primary:
    backgroundColor: "linear-gradient(135deg, #2563eb, #4f46e5 55%, #0ea5e9)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1rem"
    minHeight: "46px"
  btn-secondary:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "#ffffff"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 1rem"
    minHeight: "46px"
  data-card:
    backgroundColor: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025)), {colors.bg-card}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    shadow: "0 20px 70px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)"
    backdropFilter: "blur(22px)"
  input:
    backgroundColor: "rgba(255,255,255,0.055)"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.lg}"
    padding: "0.875rem 1rem"
    minHeight: "48px"
---

# Design System: ShiftSystem

## Overview

**Creative North Star: "The Quiet Command Center"**

ShiftSystem is the operational backbone for Phoenix team shift and attendance management. The interface is deliberately dark, calm, and precise — a place where managers and staff can see the truth of the roster at a glance without visual noise. Every element earns its pixel: shift-type color is the only accent language, typography is crisp and hierarchical, and motion exists only to confirm action or reveal state. The system is Hebrew-first (RTL), mobile-thumb friendly, and built for real operational tempo — quick decisions, clear states, zero ambiguity.

**Key Characteristics:**
- Dark, low-contrast surfaces with high-legibility typography
- Shift-type semantic color as the single source of visual identity
- Generous touch targets (≥46px) and logical RTL layout
- Functional depth via layered cards and subtle elevation, never decoration
- Every state (loading, empty, error, success, disabled) is explicitly designed

## Colors

The palette is anchored by a near-black background with cool blue undertones and a restrained set of functional accents. Shift-type colors are the only saturated signals; they are used at low opacity for backgrounds and high opacity for text/icons so the eye learns the language instantly.

### Primary Accents
- **Phoenix Blue** (#2563eb): Primary actions, focus rings, links.
- **Phoenix Cyan** (#22d3ee): Secondary highlights and data emphasis.
- **Phoenix Gold** (#f59e0b): Warnings, weekend emphasis.
- **Phoenix Rose** (#ef4444): Destructive or high-priority states.

### Shift-Type Vocabulary (semantic, used for both badges and subtle backgrounds)
- Office, Home, Night, Duty, Weekend Duty, Holiday, Sick, Vacation, Off — each with its own hue at 20% opacity background / solid text.

### Neutral System
- Background, card, elevated, border, border-strong, foreground, and muted are all defined as CSS custom properties so light/dark and future themes stay in sync.

**The One Accent Rule.** Only the four phoenix hues plus the eight shift-type colors are ever used as saturated color. No purple gradients, no cyan-on-black hero effects, no AI slop palettes.

## Typography

Geist Sans is the sole typeface family. It is neo-grotesque, highly legible at small sizes, and carries just enough character to feel intentional without calling attention to itself.

### Hierarchy
- **Display** (900, clamp(1.75rem, 4.5vw, 2.25rem), -0.025em): Page titles and primary section headers. Used once per view.
- **Body** (400, 0.9375rem, 1.55): All running text, form labels, table cells. Max measure respected in prose blocks.
- **Label** (600, 0.75rem, 0.02em): Badge text, column headers, microcopy. Uppercase where appropriate for scanning.

**The Measure Rule.** Body text never exceeds ~75ch on desktop; on mobile the viewport itself enforces it.

## Layout

- Root container: `max-w-7xl`, centered, with responsive horizontal padding.
- Vertical rhythm: 1rem base gap on mobile → 1.5rem on desktop. Cards and sections receive 1.5× or 2× breathing room.
- RTL is the default (`dir="rtl"` on `<html>`). All logical properties (`margin-inline`, `padding-inline`, `text-align: start/end`) are used; physical left/right only where geometry genuinely requires it.
- Mobile: single-column stack, 44–48px minimum touch targets, safe-area padding at bottom nav.

## Elevation & Depth

Depth is conveyed by a combination of:
- Layered semi-transparent backgrounds (`bg-card`, `bg-elevated`)
- Subtle inner highlight (`inset 0 1px 0 rgba(255,255,255,0.05)`)
- Soft outer shadow (`0 20px 70px rgba(0,0,0,0.22)`)
- Backdrop blur (22px) on glass-like cards

No hard-offset shadows, no colored glows as decoration. Elevation appears only when an element needs to lift above its neighbors (modals, popovers, drag previews).

## Shapes

- Cards: 1.35rem radius (large, friendly)
- Buttons & inputs: 1rem radius (consistent with cards)
- Badges & small controls: 0.5rem radius (compact)
- All corners are consistent; no mixing of pill, square, or “modern” 2xl radii on the same surface.

## Components

### Buttons
- Primary: gradient blue → indigo → sky, bold white text, 46px min-height, active scale 0.98.
- Secondary: low-opacity white fill with strong border.
- Danger: muted rose background with matching border.
- All buttons include focus ring (blue-500/30) and disabled opacity treatment.

### Data Cards
- Glass morphism with gradient overlay, 1px border, large radius, heavy soft shadow.
- Used for stats, summaries, and content containers.

### Inputs & Selects
- 48px min-height, rounded-2xl, low-opacity fill, strong border on focus.
- Placeholder uses muted color; validation states inherit the same border treatment.

### Shift Badges
- Fixed 2rem × 1.5rem pill with 1px border and 20% background tint.
- Color vocabulary is the single source of truth for shift meaning across the entire app.

### Navigation (Sidebar + MobileNav)
- Collapsed icons on desktop, bottom tab bar on mobile.
- Active state uses the same blue accent as primary actions.

## Do's and Don'ts

### Do:
- Use the exact shift-type color tokens for any visual representation of a shift.
- Maintain 46–48px minimum touch targets on all interactive elements.
- Keep RTL logical properties (`margin-inline-start`, `padding-inline-end`, etc.).
- Let the data-card component handle elevation; do not invent new shadow or blur combinations.
- Show explicit empty, loading, and error states for every async surface.

### Don't:
- Introduce purple/violet or cyan-on-dark gradients (AI color palette).
- Add decorative grid-line backgrounds or hairline linear-gradient overlays.
- Mix physical `left/right` with RTL layouts.
- Use icon-only navigation without labels on mobile.
- Apply motion that is purely decorative; every transition must communicate state change.