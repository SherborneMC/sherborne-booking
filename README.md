# Sherborne Booking v14

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

## v14 changes

- Reworded optional copied-person section for assistant/EA/PA use.
- Checkbox now says: “Share this request with my assistant”.
- Assistant fields are labelled simply: “Name” and “Email”.
- Calendar hold wording now distinguishes the requester from the assistant/copy recipient.
- Version updated to v14.
