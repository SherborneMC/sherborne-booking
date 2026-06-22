# Sherborne Booking v12

Cloudflare Pages booking site for introductory consultations.

## Structure

- `public/index.html`
- `functions/api/availability.js`
- `functions/api/book.js`
- `functions/_shared/calendar.js`
- `_headers`
- `.gitignore`

## Cloudflare Pages settings

- Framework preset: None
- Build command: leave blank
- Build output directory: `public`

## Required Cloudflare environment variables

- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `OWNER_EMAIL`

## Required Microsoft Graph application permissions

- `Calendars.ReadWrite`
- `Mail.Send`

Grant admin consent after adding permissions.

## v12 changes

- Shared calendar/grid logic moved to `functions/_shared/calendar.js`.
- Visitor-facing grid now renders from UTC slot times into the visitor's local timezone.
- Backend still applies all rules in London/Sherborne time.
- Mobile swipe now crosses week boundaries or falls back cleanly to arrow buttons.
- Added accessibility labels and live regions.

Deployment refresh.
