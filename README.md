# Sherborne Booking v16

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

## v16 changes
- Alternative-time requests now use a separate `/api/alternative` endpoint.
- Alternative-time requests never rebuild availability and never create a calendar hold.
- Alternative-time row is now inside the calendar table as a final full-width row.
- Alternative request sends Michael the full request, sends the client an acknowledgement, and sends the assistant note if supplied.
- If Michael email succeeds but client/assistant acknowledgement fails, the site still shows success.
- Normal slot requests now fail if Michael's notification email fails, as requested.
- User-facing error changed to: “We could not complete your request. Please contact us.”
