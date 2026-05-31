# StewardChMS — Brand Identity Design Spec
**Date:** 2026-05-31
**Status:** Approved
**Author:** Design session with Emerson Ramos

---

## Overview

This spec documents the final brand identity for StewardChMS — an open-source Church Management System. The identity is built on the Cross Key mark, a symbol rooted in Matthew 16:19 ("the keys of the Kingdom"), paired with a refined serif wordmark in a navy + gold palette.

The system is designed to scale from 16px favicon to 3" sticker without losing legibility or character.

---

## Mark — The Cross Key

A key whose bow (the circular top) is replaced by a Latin cross. The metaphor is direct: stewardship as being entrusted with the keys of the Kingdom. Simple enough to read at favicon size; distinctive enough to own at full scale.

### SVG Shape Definition

```
viewBox: 0 0 64 82

Cross vertical arm:   rect x=28 y=2  width=8  height=32 rx=4
Cross horizontal arm: rect x=12 y=14 width=40 height=8  rx=4
Key shaft:            rect x=30 y=32 width=4  height=40 rx=2
Key tooth 1:          rect x=34 y=53 width=13 height=5  rx=2.5
Key tooth 2:          rect x=34 y=64 width=9  height=5  rx=2.5
```

---

## Color Palette — Kingdom Authority

| Token | Name | Hex | Usage |
|---|---|---|---|
| `brand-navy-deep` | Deep Navy | `#060F1A` | Page backgrounds |
| `brand-navy` | Navy | `#0D1B2E` | Primary dark surface |
| `brand-navy-mid` | Navy Mid | `#1A2F4A` | Cards, elevated surfaces |
| `brand-gold` | Kingdom Gold | `#E8B847` | Primary mark + wordmark color |
| `brand-gold-dark` | Gold Dark | `#C49A2E` | Pressed/hover states on gold |
| `brand-parchment` | Parchment | `#F5EED8` | Light mode background |
| `brand-white` | White | `#FFFFFF` | Light mode text |

**Light mode:** Mark renders in `brand-navy` (#0D1B2E) on `brand-parchment` or white backgrounds.
**Dark mode:** Mark renders in `brand-gold` (#E8B847) on `brand-navy` backgrounds.

---

## Typography — Wordmark

| Property | Value |
|---|---|
| Font family | Georgia, 'Times New Roman', serif |
| Font weight | 300 (light) |
| Letter spacing | 0.32em on primary name; 0.48em on subline |
| Primary name | `STEWARD` (all caps) |
| Separator | Thin horizontal rule (1px, 35% gold opacity) |
| Subline | `CHURCH MANAGEMENT SYSTEM` (all caps, 0.48 opacity) |

---

## Format Variants

| Format | File | Usage |
|---|---|---|
| Primary mark (dark) | `steward-mark.svg` | Favicon, dark backgrounds |
| Primary mark (light) | `steward-mark-light.svg` | Light mode surfaces |
| Horizontal lockup | `steward-lockup.svg` | Navigation, headers |
| Stacked lockup | `steward-lockup-stacked.svg` | App splash, auth pages |
| App icon | `steward-app-icon.svg` | Mobile/desktop app icon |

---

## Sticker / Badge Format

Circular badge: navy background, gold border (6px), double-ring edge (2px parchment gap + 4px gold). Mark centered, wordmark below with rule separator. Ideal for die-cut stickers.

---

## What This Is Not

- Not a shield (the old mark was a shield — this is a key)
- Not corporate blue — the navy is deep and warm, not tech-blue
- Not gold on white (always navy background or parchment background for light mode)

---

## Files

- Brand guide: `docs/brand/brand-guide.md`
- Branding skill: `docs/brand/steward-branding-skill.md`
- SVG assets: `frontend/public/steward-*.svg`
