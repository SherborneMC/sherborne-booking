# Sherborne Booking v15

Cloudflare Pages booking site for introductory consultations.

## Cloudflare Pages settings
- Framework preset: None
- Build command: leave blank
- Build output directory: `public`

## Required environment variables
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `OWNER_EMAIL`

## Required Microsoft Graph application permissions
- `Calendars.ReadWrite`
- `Mail.Send`

## v15 changes
- Weekday-specific introductory slot limits.
- Alternative-time request link and form mode.
- Alternative requests email Michael only and do not create calendar holds.
- Optional “Where are you based?” field for alternative requests.
- Hidden honeypot field silently discards likely bot submissions.
