# Steward Branding Skill

Use this skill whenever working on any visual, written, or design element of StewardChMS — UI components, documentation, marketing copy, SVG assets, emails, or any branded surface.

---

## The Mission

StewardChMS is an open-source Church Management System built by and for people of faith. The brand expresses **faithful stewardship** — being entrusted with what belongs to God (people, resources, time) and managing it with care and integrity.

The brand voice and visual identity must always serve this mission. Never let the design feel corporate, generic, or tech-startup. It should feel like it belongs to a community of faith.

---

## Mark — The Cross Key

The Steward logo is a **Cross Key**: a key whose bow (top circle) is replaced by a Latin cross.

**Scripture reference:** Matthew 16:19 — *"I will give you the keys of the kingdom of heaven."*

**SVG shape** (viewBox 0 0 64 82):
```xml
<!-- Cross vertical arm -->
<rect x="28" y="2" width="8" height="32" rx="4" fill="[COLOR]"/>
<!-- Cross horizontal arm -->
<rect x="12" y="14" width="40" height="8" rx="4" fill="[COLOR]"/>
<!-- Key shaft -->
<rect x="30" y="32" width="4" height="40" rx="2" fill="[COLOR]"/>
<!-- Key tooth 1 -->
<rect x="34" y="53" width="13" height="5" rx="2.5" fill="[COLOR]"/>
<!-- Key tooth 2 -->
<rect x="34" y="64" width="9" height="5" rx="2.5" fill="[COLOR]"/>
```

Replace `[COLOR]` with:
- `#E8B847` (Kingdom Gold) — dark backgrounds
- `#0D1B2E` (Navy) — light/parchment backgrounds

**Never** use the old shield mark (two interlocking blue circles on a navy shield). It is retired.

---

## Color Palette

```
--brand-navy-deep:  #060F1A   /* page backgrounds */
--brand-navy:       #0D1B2E   /* primary dark surface */
--brand-navy-mid:   #1A2F4A   /* cards, elevated surfaces */
--brand-gold:       #E8B847   /* primary accent — mark, CTAs */
--brand-gold-dark:  #C49A2E   /* hover/pressed on gold */
--brand-parchment:  #F5EED8   /* light mode background */
--brand-white:      #FFFFFF   /* light mode text */
```

**Rules:**
- Gold on navy: always safe
- Navy on parchment: always safe
- Gold on white: never (contrast fails)
- Navy on dark: never (invisible)

---

## Typography

**Wordmark only** (not UI):
```
Font:           Georgia, 'Times New Roman', serif
Weight:         300 (light)
Primary name:   STEWARD — letter-spacing: 0.32em, all-caps
Rule:           1px line, gold at 35% opacity
Subline:        CHURCH MANAGEMENT SYSTEM — letter-spacing: 0.48em, 48% opacity
```

**UI / App interface:**
```
Font: Inter, system-ui, -apple-system, sans-serif
```
Georgia is reserved for brand marks and formal moments only — never in tables, forms, or data UI.

---

## Logo Files

All files live in `frontend/public/`:

| File | Use When |
|------|----------|
| `steward-mark.svg` | Dark backgrounds, favicon, sidebar logos |
| `steward-mark-light.svg` | Light backgrounds, parchment |
| `steward-lockup.svg` | Navigation bars, login header, marketing |
| `steward-lockup-stacked.svg` | Splash screens, auth pages, setup wizard |
| `steward-app-icon.svg` | App icon, rounded-square contexts |

**In React components:**
```tsx
const logoSrc = resolvedTheme === 'dark' ? '/steward-mark.svg' : '/steward-mark-light.svg'
```

---

## Writing in Steward's Voice

| Instead of | Use |
|---|---|
| "Manage your congregation" | "Steward your people" |
| "Track donations" | "Record giving faithfully" |
| "User management" | "Member care" |
| "Dashboard" | "Overview" |
| "Settings" | "Configuration" |
| "Sign in" | "Sign in" (this one is fine as-is) |

**Tone principles:**
- **Faithful, not religious** — grounded in scripture, never preachy
- **Trustworthy, not corporate** — warm authority, not cold enterprise
- **Clear, not minimal** — precise, not stripped-down
- **Servant-minded** — the software serves the church

Anchor text for the application: *"Faithful stewardship of what God has entrusted to you."*

---

## Applying the Brand — Checklist

When working on any Steward surface:

- [ ] Is the correct mark being used (dark vs light mode)?
- [ ] Are only brand colors in use (no arbitrary grays, blues, or greens)?
- [ ] Does the wordmark use Georgia light with wide tracking?
- [ ] Is copy written in the servant-minded, faithful voice?
- [ ] Is the old shield mark absent?
- [ ] Does the design feel like it belongs to a faith community — not a SaaS startup?

---

## What NOT to Do

- Do not add effects (shadows, glows, gradients) to the mark
- Do not recolor the mark to anything outside the brand palette
- Do not distort or stretch the mark
- Do not use the mark at sizes below 16px without simplification
- Do not write in a cold, transactional, or purely technical voice
- Do not use the shield mark from the previous identity

---

## Scripture Reference for Brand Moments

When a headline or splash moment calls for scripture, use one of these:

- *"Moreover, it is required of stewards that they be found faithful."* — 1 Corinthians 4:2
- *"Whoever can be trusted with very little can also be trusted with much."* — Luke 16:10
- *"Each of you should use whatever gift you have received to serve others, as faithful stewards of God's grace."* — 1 Peter 4:10

---

## Full Brand Documentation

See `docs/brand/brand-guide.md` for the complete brand guide including sticker specs, print formats, and extended usage rules.
