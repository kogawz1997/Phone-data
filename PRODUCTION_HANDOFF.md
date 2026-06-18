# KOGA Production Handoff

This document closes the current UI redesign pass and records what must be deployed, checked, and rolled back if needed.

## Scope completed

### Admin web
- Premium dark console visual layer
- Unified navigation
- Mobile bottom dock navigation
- Outside tap closes open mobile menu
- Global home shortcut on every non-home admin route
- Skip link and focus states
- Reduced motion support
- Layout guards for cards, forms, and tables

### Customer web
- Premium customer portal visual layer
- Dark KOGA brand system aligned with admin
- Skip link
- Main content target helper
- Focus states
- Reduced motion support
- Hardened Railway start script

### Documentation
- `DESIGN_MEMORY.md`
- `UI_RELEASE_CHECKLIST.md`
- `PRODUCTION_HANDOFF.md`

## Files added or updated

### Admin web
- `apps/admin-web/src/app/layout.tsx`
- `apps/admin-web/src/app/ux-enhancements.tsx`
- `apps/admin-web/src/app/home-shortcut.tsx`
- `apps/admin-web/src/app/admin-layout-cleanup.css`
- `apps/admin-web/src/app/admin-mobile-dock.css`
- `apps/admin-web/src/app/admin-luxury-modern-v2.css`
- `apps/admin-web/src/app/admin-shortcuts.css`
- `apps/admin-web/src/app/admin-compact-header.css`

### Customer web
- `apps/customer-web/src/app/layout.tsx`
- `apps/customer-web/src/app/customer-ux.tsx`
- `apps/customer-web/src/app/customer-luxury-modern.css`
- `apps/customer-web/package.json`

### Repo root
- `DESIGN_MEMORY.md`
- `UI_RELEASE_CHECKLIST.md`
- `PRODUCTION_HANDOFF.md`

## Railway services to redeploy

Redeploy these services in this order:

1. `customer-web`
2. `admin-web`

Reason: customer-web was the service showing `Application failed to respond`, so verify it first.

## Railway config expectations

### customer-web
Expected start script:

```bash
next start -H 0.0.0.0
```

Railway should inject the port using the `PORT` environment variable. If the service still fails to respond:

1. Open Railway deploy logs.
2. Check whether `next build` succeeded.
3. Check whether `next start` ran.
4. Confirm it is listening on the injected `PORT`.
5. Roll back customer-web first if the deploy blocks production traffic.

### admin-web
Admin currently keeps its existing start configuration. Do not change it unless Railway logs show a port/start issue there too.

## Manual acceptance checklist

Use `UI_RELEASE_CHECKLIST.md` as the source of truth.

Minimum release gate:

- [ ] customer-web opens without Railway error
- [ ] admin-web opens without Railway error
- [ ] mobile admin menu does not cover page content
- [ ] tapping outside mobile menu closes it
- [ ] home shortcut appears on non-home admin routes
- [ ] customer portal login screen is readable on mobile
- [ ] contract/payment/history sections do not overflow horizontally
- [ ] keyboard focus ring is visible
- [ ] private/incognito browser shows the latest design

## Known non-code deployment risks

- Browser cache may show old CSS or old bundles after Railway deploy.
- Railway may be using a service-level start command that overrides `package.json`.
- If service root directory is wrong, Railway may build the wrong app in the monorepo.
- Environment variables can still break runtime API calls after the page loads, even if the UI renders.

## Rollback plan

If production fails:

1. Roll back the latest Railway deployment for the affected service.
2. If needed, revert only the visual-layer commit for that service.
3. Do not touch API or database unless logs prove the issue is backend-related.

## Next improvement after release

After the current redesign is deployed and stable, the next pass should be per-page refinement:

- Admin dashboard information hierarchy
- Settings page section grouping
- Customer payment request cards
- Customer contract table mobile UX
- Empty states and error copy cleanup

Do not start this next pass until both production web services are stable.
