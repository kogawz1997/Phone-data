# KOGA Design Memory

## Product identity
KOGA is a premium lease-to-own and MDM SaaS for phone rental shops. The visual system should feel like a serious operations console, not a generic SaaS template.

## Brand tone
- Premium
- Calm
- Trustworthy
- Operational
- Modern
- Fast to scan

Avoid:
- Overused purple/blue AI gradients
- Random accent colors
- Dense cards without hierarchy
- Menus that compete with content
- Light mode that is only a color inversion

## Color system
Use one primary accent family across admin and customer surfaces:

- Ink 950: `#020712`
- Ink 900: `#06101f`
- Cyan accent: `#67e8f9`
- Deep blue accent: `#2563eb`
- Main text: `#edf7ff`
- Muted text: `#9fb2c9`

Rules:
- Do not use pure black as the main background.
- Do not introduce new accent colors unless the state requires it.
- Status colors must be paired with text or icons, never color alone.

## Surfaces
Cards, panels, tables, and forms should use:
- tinted dark glass surfaces
- subtle 1px borders
- soft ink-tinted shadows
- inner highlight for depth
- rounded containers around `22px` to `30px`

Use radius hierarchy:
- large shell/card: `28px` to `30px`
- buttons/input: `16px`
- icons/logo blocks: `10px` to `15px`

## Typography
Preferred stack:
- Display: `Aptos Display`, `Outfit`, `Geist`, `SF Pro Display`, system
- Body: `Aptos`, `Outfit`, `Geist`, `SF Pro Display`, system

Rules:
- Large headings use tight line-height and negative tracking.
- Body copy should be readable and not overly wide.
- Data-heavy tables should use tabular numbers.
- Use sentence case unless a label is genuinely a small system label.

## Layout
Admin:
- Mobile navigation should use a bottom dock, never a left rail that blocks content.
- Desktop can use a fixed rail if content is offset correctly.
- Every route except home should have a clear home shortcut.
- Tables must scroll inside their own container on mobile.

Customer portal:
- Same brand world as admin, but calmer and consumer-friendly.
- Primary tasks must be obvious: pay, view contracts, view payment history, get help.

## Interaction
- Focus rings must be visible.
- Buttons need hover and active feedback.
- Motion should be subtle, 150ms to 250ms.
- Respect reduced-motion preferences.
- Empty states should tell the user what to do next.
- Error states should be direct and actionable.

## Accessibility
- Skip links are required for admin and customer layouts.
- Main content target must be available as `#main-content`.
- Icon-only buttons need accessible names.
- Active navigation should expose current state with `aria-current` where possible.
- Touch targets should be at least 44px.

## Current implementation layers
Admin:
- `apps/admin-web/src/app/admin-layout-cleanup.css`
- `apps/admin-web/src/app/admin-mobile-dock.css`
- `apps/admin-web/src/app/admin-luxury-modern-v2.css`
- `apps/admin-web/src/app/admin-shortcuts.css`
- `apps/admin-web/src/app/ux-enhancements.tsx`
- `apps/admin-web/src/app/home-shortcut.tsx`

Customer:
- `apps/customer-web/src/app/customer-luxury-modern.css`
- `apps/customer-web/src/app/customer-ux.tsx`

## Release rule
Before shipping, deploy and manually test both Railway services:
- `admin-web`
- `customer-web`

Do not call the redesign complete until mobile, keyboard, and main customer/admin flows have been checked.
