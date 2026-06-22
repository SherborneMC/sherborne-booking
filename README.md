# Sherborne Booking v13

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

## v13 changes

- Heading changed to “Introductory consultations”.
- Added a calm “Later availability” divider between morning and late-afternoon rows.
- Border colour strengthened to match the faint version text colour.
- Smaller screens now centre the page heading, date heading and footer elements.
- Swipe/drag handling strengthened while preserving vertical scrolling.
- During refresh, the site heading briefly changes to “Updating available times…”.
- Mobile request slots are slightly taller.
- Empty day cells receive a very faint dash so the grid does not look broken.
