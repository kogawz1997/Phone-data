# KOGA UI Release Checklist

Use this before every production deploy of the redesigned UI. Tiny checklist, enormous reduction in future pain. Humanity occasionally learns.

## Services to redeploy
- [ ] `admin-web`
- [ ] `customer-web`

## Railway response check
If Railway shows `Application failed to respond`:

1. Open the service deploy logs immediately.
2. Confirm the service built successfully.
3. Confirm the service starts with the correct package script.
4. Confirm the service listens on Railway's injected `PORT`.
5. For `customer-web`, the start script should be `next start -H 0.0.0.0`.
6. If the error continues, roll back the latest customer-web deploy first, then inspect build output.

## Admin web routes
Check desktop and mobile:

- [ ] `/`
- [ ] `/settings`
- [ ] `/platform`
- [ ] `/signup`
- [ ] `/customer-access`
- [ ] `/payment-requests`
- [ ] `/apple-custody`
- [ ] `/integrations`

## Customer web routes
- [ ] Customer portal home
- [ ] Login state
- [ ] Logged-in state
- [ ] Payment request section
- [ ] Contract table section
- [ ] Payment history section
- [ ] Help/contact section

## Navigation
- [ ] Admin mobile menu is a bottom dock, not a left rail covering content
- [ ] Mobile menu opens and shows labels clearly
- [ ] Tapping outside the open mobile menu closes it
- [ ] Desktop menu does not cover content
- [ ] Active route is visible
- [ ] Every non-home admin route shows the home shortcut
- [ ] Home route does not show a redundant home shortcut

## Layout and content
- [ ] No horizontal page overflow on iPhone width
- [ ] Cards do not cut text
- [ ] Forms fit within viewport
- [ ] Tables scroll inside their own container
- [ ] Primary action is clear on each page
- [ ] Dense information is grouped into readable cards or tables
- [ ] Empty states explain what happens next
- [ ] Errors are readable and actionable

## Accessibility
- [ ] Skip link appears on keyboard focus
- [ ] Skip link moves focus to main content
- [ ] Keyboard tab order is usable
- [ ] Focus ring is visible on buttons, links, inputs, and selects
- [ ] Icon-only buttons have accessible labels
- [ ] Statuses are not communicated by color alone
- [ ] Touch targets are at least 44px
- [ ] Reduced motion mode does not run large animations

## Visual quality
- [ ] Admin and customer portals feel like the same product family
- [ ] Accent color is consistent: cyan-blue
- [ ] No random purple/blue AI-template gradients
- [ ] Typography is readable and intentional
- [ ] Cards have consistent radius and surface treatment
- [ ] Light mode, if used, remains readable

## Browser checks
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari or Firefox

## Cache sanity
After deploy:
- [ ] Open in private/incognito first
- [ ] If old UI appears, clear site data or hard refresh
- [ ] Confirm deployed commit matches latest main

## Rollback
If the UI breaks production:
1. Roll back the latest Railway deploy.
2. Revert the last visual-layer commit.
3. Keep API and DB untouched unless the issue is confirmed backend-related.
