# StewardChMS Brand Guide

> **Mission:** StewardChMS exists to help churches be faithful stewards of what God has entrusted to them — their people, their resources, and their time.

---

## The Mark — Cross Key

The Steward mark is a key whose bow (the circular top) is a Latin cross. It draws directly from Matthew 16:19:

> *"I will give you the keys of the kingdom of heaven."*

A key communicates stewardship — being entrusted with something precious that belongs to another. The cross ensures the faith dimension is never separated from the function. Together they say: **this software serves the Church, in service of the Kingdom.**

The mark is fully geometric — built from rectangles with rounded corners. It reads clearly at 16px (favicon) and holds its character at any scale up to print.

---

## Logo System

### Primary Mark (Dark Mode)

Gold key on transparent background. Use on dark navy surfaces.

```
File: frontend/public/steward-mark.svg
Color: #E8B847 (Kingdom Gold)
Background: Transparent (use on #0D1B2E or darker)
```

### Primary Mark (Light Mode)

Navy key on transparent background. Use on light/parchment surfaces.

```
File: frontend/public/steward-mark-light.svg
Color: #0D1B2E (Navy)
Background: Transparent (use on #F5EED8 or white)
```

### Horizontal Lockup

Mark + wordmark side by side. Use in navigation headers, login pages, and marketing materials.

```
File: frontend/public/steward-lockup.svg
Composition: Mark | vertical divider | STEWARD (refined serif) + rule + subline
```

### Stacked Lockup

Mark centered above wordmark. Use on splash screens, setup wizard, and social cards.

```
File: frontend/public/steward-lockup-stacked.svg
```

### App Icon

Mark on rounded-square navy background. Used for mobile app icon, desktop shortcut, and browser tab.

```
File: frontend/public/steward-app-icon.svg
Container: #0D1B2E, border-radius: 22.5% of size
```

---

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|---|---|---|
| `--brand-navy-deep` | `#060F1A` | Page backgrounds, deepest surfaces |
| `--brand-navy` | `#0D1B2E` | Primary dark surface, app icon bg |
| `--brand-navy-mid` | `#1A2F4A` | Cards, elevated dark surfaces |
| `--brand-gold` | `#E8B847` | Mark, wordmark, primary CTA accents |
| `--brand-gold-dark` | `#C49A2E` | Hover/pressed state on gold elements |

### Supporting Colors

| Token | Hex | Usage |
|---|---|---|
| `--brand-parchment` | `#F5EED8` | Light mode page background |
| `--brand-white` | `#FFFFFF` | Light mode primary text |

### Do Not Use

- **Bright/neon blue** — clashes with the authority of the navy
- **Gray as a primary** — the palette is warm, not cool-neutral
- **Gold on white** — insufficient contrast; always pair with navy or parchment

---

## Typography

### Wordmark

The wordmark uses **Georgia** (serif) at light weight. This is deliberately refined rather than bold — quiet confidence, not loud authority.

```
Font family:    Georgia, 'Times New Roman', serif
Font weight:    300 (light)
Primary name:   STEWARD — all caps, letter-spacing 0.32em
Separator:      1px horizontal rule, gold at 35% opacity
Subline:        CHURCH MANAGEMENT SYSTEM — all caps, 0.48em spacing, 48% opacity
```

### App Interface Typography

The app interface uses the system font stack for UI elements (Inter, system-ui). The brand serif is reserved for the mark and formal brand moments — it should not appear in data tables or form labels.

```
UI font:  Inter, system-ui, -apple-system, sans-serif
Brand:    Georgia, serif (logo, splash, marketing only)
```

---

## Usage Rules

### Do

- Use the gold mark on navy for all dark backgrounds
- Use the navy mark on parchment or white for all light backgrounds
- Maintain clear space equal to the width of the key cross arm on all sides
- Use the horizontal lockup in navigation bars
- Use the stacked lockup on full-page branded moments (login, splash, print)
- Use the mark alone for favicons, app icons, and 16px contexts

### Do Not

- Do not place the gold mark on white — insufficient contrast
- Do not recolor the mark to any color outside the brand palette
- Do not stretch or distort the mark proportions
- Do not add drop shadows, glows, or effects to the mark
- Do not use the old shield mark — it is retired
- Do not use any font other than Georgia for the wordmark

---

## Sticker & Print

The approved sticker format is a circular badge:

- Navy background circle
- 6px kingdom gold border
- 2px parchment gap ring
- 4px outer gold ring
- Mark centered in upper half
- `STEWARD` wordmark + rule + `CHURCH MANAGEMENT` subline below

This format is suitable for die-cut stickers (Sticker Mule, Sticker Giant), pin badges, and embroidery patches.

---

## Brand Voice (Companion)

The visual identity carries a tone — the copy and UI text should match it:

- **Faithful, not religious** — grounded in scripture but never preachy
- **Trustworthy, not corporate** — warm authority, not cold enterprise
- **Clear, not minimal** — precise language, not stripped-down tech-speak
- **Servant-minded** — the software serves the church, not the other way around

Example: "Manage your congregation" → "Steward your people"

---

## Files Reference

```
frontend/public/
  steward-mark.svg              # Dark mode mark (gold)
  steward-mark-light.svg        # Light mode mark (navy)
  steward-lockup.svg            # Horizontal lockup
  steward-lockup-stacked.svg    # Stacked lockup
  steward-app-icon.svg          # App icon (rounded square)

docs/brand/
  brand-guide.md                # This file
  steward-branding-skill.md     # AI assistant branding instructions
```

---

*"Moreover, it is required of stewards that they be found faithful." — 1 Corinthians 4:2*
