# KOGA Production Handoff

This document closes the current UI redesign pass and records what must be deployed, checked, and rolled back if needed.

## Scope completed

### Admin web
- Reference-inspired dark enterprise desktop shell
- Compact left sidebar / icon rail matching the supplied desktop boards
- Unified navigation
- Mobile bottom dock navigation
- Outside tap closes open mobile menu
- Global home shortcut on every non-home admin route
- Admin root login gate restored and kept separate from dashboard logic
- Store command center dashboard as the new root after login
- Global Atlas readability layer for all admin pages
- Page-specific layout patterns for customers, inventory, contracts, payments, collection, risk, reports, integrations, setup, platform owner pages
- Dense table, metric card, filter bar, right-side detail panel, QR/payment, chart/report, and provider-grid styling patterns
- Skip link and focus states
- Reduced motion support
- Layout guards for cards, forms, and tables

### Customer web
- Reference-inspired mobile customer portal styling
- App-like customer portal topbar, hero, payment, contract, history, help sections
- Global Atlas readability layer across customer-facing pages
- QR/payment card styling closer to the supplied mobile board
- Dark KOGA brand system aligned with admin
- Skip link
- Main content target helper
- Focus states
- Reduced motion support
- Hardened Railway target detection

### Documentation
- `DESIGN_MEMORY.md`
- `UI_RELEASE_CHECKLIST.md`
- `PRODUCTION_HANDOFF.md`

## Files added or updated

### Admin web
- `apps/admin-web/src/app/layout.tsx`
- `apps/admin-web/src/app/page.tsx`
- `apps/admin-web/src/app/ux-enhancements.tsx`
- `apps/admin-web/src/app/home-shortcut.tsx`
- `apps/admin-web/src/app/admin-login-gate.css`
- `apps/admin-web/src/app/admin-layout-cleanup.css`
- `apps/admin-web/src/app/admin-mobile-dock.css`
- `apps/admin-web/src/app/admin-command-center.tsx`
- `apps/admin-web/src/app/admin-command-center.css`
- `apps/admin-web/src/app/admin-global-atlas.css`
- `apps/admin-web/src/app/admin-reference-shell.css`
- `apps/admin-web/src/app/admin-reference-pages.css`
- `apps/admin-web/src/app/admin-luxury-modern-v2.css`
- `apps/admin-web/src/app/admin-shortcuts.css`
- `apps/admin-web/src/app/admin-compact-header.css`

### Customer web
- `apps/customer-web/src/app/page.tsx`
- `apps/customer-web/src/app/layout.tsx`
- `apps/customer-web/src/app/customer-ux.tsx`
- `apps/customer-web/src/app/customer-command-portal.tsx`
- `apps/customer-web/src/app/customer-command-portal.css`
- `apps/customer-web/src/app/customer-global-atlas.css`
- `apps/customer-web/src/app/customer-reference-mobile.css`
- `apps/customer-web/src/app/customer-luxury-modern.css`
- `apps/customer-web/package.json`

### Railway scripts
- `scripts/railway-target.mjs`
- `scripts/railway-build.mjs`
- `scripts/railway-start.mjs`

### Repo root
- `DESIGN_MEMORY.md`
- `UI_RELEASE_CHECKLIST.md`
- `PRODUCTION_HANDOFF.md`

## Railway services to redeploy

Redeploy these services in this order:

1. `customer-web`
2. `admin-web`

Reason: customer-web was the service showing `Application failed to respond`, so verify it first.

## Railway target variables

Because `/railway.json` uses shared scripts, every Railway service must explicitly identify what it is.

Set these variables in Railway:

```txt
customer-web: KOGA_RAILWAY_TARGET=customer-web
admin-web:    KOGA_RAILWAY_TARGET=admin-web
api:          KOGA_RAILWAY_TARGET=api
```

If a service uses admin-web for owner/platform pages, use:

```txt
KOGA_RAILWAY_TARGET=admin-web
```

The shared script now refuses to silently fall back to `api`. If target detection fails, the deploy log will say exactly what variable to set.

## Railway config expectations

`/railway.json` should stay as:

```txt
Build Command: node scripts/railway-build.mjs
Start Command: node scripts/railway-start.mjs
Healthcheck Path: /health
```

Both `admin-web` and `customer-web` include `/health` routes.

If customer-web still fails to respond:

1. Open Railway deploy logs.
2. Check whether `[railway-target] selected customer-web` appears.
3. Check whether `next build` succeeded.
4. Check whether `next start` ran.
5. Confirm it is listening on Railway's injected `PORT`.
6. Roll back customer-web first if the deploy blocks production traffic.

## Manual acceptance checklist

Use `UI_RELEASE_CHECKLIST.md` as the source of truth.

Minimum release gate:

- [ ] customer-web opens without Railway error
- [ ] admin-web opens without Railway error
- [ ] admin login page accepts valid credentials
- [ ] admin root shows Store Command Center after login
- [ ] admin desktop sidebar matches compact reference board direction
- [ ] customers/inventory/contracts/payments pages show dense table and metric-card treatment
- [ ] collection/risk/reports pages show chart/report-card treatment
- [ ] integrations/setup pages show provider/setup-card treatment
- [ ] platform owner pages show owner analytics board treatment
- [ ] mobile admin menu does not cover page content
- [ ] tapping outside mobile menu closes it
- [ ] home shortcut appears on non-home admin routes
- [ ] customer portal login screen is readable on mobile
- [ ] customer QR/payment screen looks app-like and readable
- [ ] contract/payment/history sections do not overflow horizontally
- [ ] status chips good/warn/bad are readable and not color-only
- [ ] keyboard focus ring is visible
- [ ] private/incognito browser shows the latest design

## Known non-code deployment risks

- Browser cache may show old CSS or old bundles after Railway deploy.
- Railway may be using service-level variables from a different environment.
- If `KOGA_RAILWAY_TARGET` is missing, deploy will now fail fast with a clear error.
- If service root directory is wrong, Railway may build the wrong app in the monorepo.
- Environment variables can still break runtime API calls after the page loads, even if the UI renders.
- If a page uses unusual class names, the global reference CSS will improve it, but a full JSX rebuild may still be needed for 1:1 matching.

## Rollback plan

If production fails:

1. Roll back the latest Railway deployment for the affected service.
2. If needed, revert only the visual-layer commit for that service.
3. If login fails, revert `apps/admin-web/src/app/page.tsx` first.
4. Do not touch API or database unless logs prove the issue is backend-related.

## What is still not a 1:1 rebuild

This pass makes all pages closer to the supplied boards through shell, global readability, and page-pattern layers. A true 1:1 page rebuild would still require editing the JSX of each page to explicitly use the same grid, table, and right-panel structure as the mockups.

Do that only after this release is deployed and verified stable.
