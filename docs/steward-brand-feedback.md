# Steward Brand Integration Feedback

**Date:** February 2026  
**Integrating Project:** StewardChMS  
**Repository:** https://github.com/24Skater/steward-brand

This document captures issues encountered, solutions implemented, and suggestions for improving the steward-brand design system based on the integration experience with StewardChMS.

---

## Summary

Overall, the steward-brand design system provides a solid foundation with well-organized design tokens, a comprehensive color palette, and nicely designed UI components. The integration process identified several areas that could be improved to make adoption easier for consuming applications.

---

## Issues Encountered

### 1. Packages Not Published to npm

**Problem:** The `@steward/tokens` and `@steward/ui` packages are not published to npm, making installation difficult.

```bash
# This fails:
npm install @steward/tokens @steward/ui

# Error: 404 Not Found - GET https://registry.npmjs.org/@steward%2ftokens
```

**Workaround:** Installed from GitHub and manually extracted source files:
```bash
npm install github:24Skater/steward-brand#main
```

**Recommendation:** Publish packages to npm with proper semantic versioning to enable standard `npm install` workflow.

---

### 2. Packages Not Pre-built (Missing dist Folders)

**Problem:** The packages in the monorepo don't have pre-built `dist` folders, requiring consumers to build them locally.

**Impact:** 
- Cannot import from standard paths like `@steward/tokens/dist/tokens.css`
- Had to manually generate CSS tokens from source JSON files
- Had to copy component source files directly into the consuming project

**Recommendation:** 
- Include pre-built `dist` folders in the repository, OR
- Publish built packages to npm with proper exports, OR
- Add a `postinstall` script that builds the packages automatically

---

### 3. CSS Tokens File Not Generated

**Problem:** The `@import '@steward/tokens/dist/tokens.css'` in `globals.css` references a file that doesn't exist in the repo.

**Workaround:** Manually created `steward-tokens.css` by converting the DTCG JSON tokens to CSS custom properties.

**Recommendation:** Include a generated `tokens.css` file or document the build process for generating it.

---

### 4. Component API Differences from shadcn/ui

**Problem:** Some naming differences between @steward/ui and shadcn/ui components caused migration friction:

| shadcn/ui | @steward/ui | Notes |
|-----------|-------------|-------|
| `variant="default"` | `variant="primary"` | Button default variant |
| `variant="destructive"` | `variant="danger"` | Destructive actions |
| `text-muted-foreground` | `text-muted` | Muted text class |

**Workaround:** Added alias variants to maintain backward compatibility:
```tsx
// Added both for compatibility
variant: {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  // ...
}
```

**Recommendation:** Document the variant mapping for projects migrating from shadcn/ui, or provide a migration guide.

---

### 5. Missing Components

**Problem:** Some components used by StewardChMS are not included in @steward/ui:

- `AlertDialog` (Radix-based)
- `Popover` (Radix-based)  
- `Calendar` (react-day-picker based)
- `DatePicker` / `DateTimePicker`

**Workaround:** Kept existing shadcn-style components and updated them to use Steward CSS variables.

**Recommendation:** Either add these components to @steward/ui or document which components are intentionally excluded with guidance on building custom ones.

---

### 6. CSS Variable Naming Convention

**Problem:** The `--st-*` prefix is different from shadcn/ui's convention, requiring CSS variable mapping for compatibility.

**Example:**
```css
/* Steward uses: */
--st-primary
--st-fg
--st-surface

/* shadcn uses: */
--primary
--foreground  
--background
```

**Workaround:** Created a CSS file that defines both conventions for gradual migration:
```css
:root {
  /* Steward tokens */
  --st-primary: var(--st-color-brand-blue);
  
  /* Legacy shadcn compatibility */
  --primary: 217 91% 60%;
}
```

**Recommendation:** Either provide a compatibility layer or document the full mapping between conventions.

---

### 7. Tailwind Preset Color Values Use CSS Variables

**Problem:** The Tailwind preset references CSS variables that must be defined, but the variable definitions aren't included automatically.

```javascript
// tailwind.preset.js
colors: {
  background: "var(--st-bg)",  // Requires --st-bg to be defined
  // ...
}
```

**Recommendation:** Document that the CSS tokens file must be imported before the Tailwind preset will work, or bundle the CSS variables into the preset.

---

## Suggestions for Improvement

### 1. Create a Quick Start Guide

A simple getting-started document would help:

```markdown
# Quick Start

1. Install packages:
   npm install @steward/tokens @steward/ui

2. Import CSS tokens in your main CSS file:
   @import '@steward/tokens/dist/tokens.css';

3. Add the Tailwind preset:
   // tailwind.config.js
   import stewardPreset from '@steward/ui/tailwind.preset';
   export default { presets: [stewardPreset] };

4. Import components:
   import { Button, Card, Input } from '@steward/ui';
```

### 2. Add TypeScript Types

The component type exports are good, but adding a `types` entry point would help:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./types": { "types": "./dist/types.d.ts" }
  }
}
```

### 3. Provide a Migration Script

For projects using shadcn/ui, a codemod or migration script would be valuable:

```bash
npx @steward/migrate --from shadcn
```

### 4. Add Storybook Documentation

The repo has storybook configured but doesn't appear to have stories for all components. A hosted Storybook would help developers explore the components.

### 5. Include Logo Assets in npm Package

The logo assets in `/assets/logo/` are useful but not included in the npm package. Consider:
- Adding them to `@steward/tokens` under `/dist/assets/`
- Or creating a separate `@steward/assets` package

### 6. Add Dark Mode Toggle Example

The tokens support dark mode via `.dark` class, but an example of implementing a theme toggle would be helpful.

---

## What Worked Well

1. **Color Palette:** The Steward color system (Navy, Blue, Emerald, Amber, Red) is cohesive and well-documented.

2. **Typography System:** Using Inter with the defined scale (display, h1-h3, body, small, caption) provides excellent consistency.

3. **Tailwind Preset:** The preset structure is clean and extensible.

4. **Component Quality:** The components in `@steward/ui` are well-built with proper TypeScript types, accessibility considerations, and Radix UI primitives.

5. **Logo Assets:** The SVG logos are clean and versatile with light/dark variants.

6. **Naming Convention:** The product naming guide (`Steward · ChMS`) is clear and easy to implement.

---

## Integration Checklist Used

- [x] Install steward-brand packages
- [x] Update Tailwind config with preset
- [x] Import/create CSS tokens
- [x] Add Inter font
- [x] Copy logo assets
- [x] Migrate UI components
- [x] Update branding (name format, colors)
- [x] Test in production build

---

## Questions for the Steward Brand Team

1. Is there a planned npm publish date for the packages?
2. Are there plans to add the missing components (AlertDialog, Popover, Calendar)?
3. Is shadcn/ui compatibility a goal, or is the intent to be a standalone system?
4. Should consuming apps use the `--st-*` prefix or can they define their own CSS variable names?

---

*Feedback prepared by: StewardChMS Development Team*  
*Contact: [GitHub Issues](https://github.com/24Skater/steward-brand/issues)*

