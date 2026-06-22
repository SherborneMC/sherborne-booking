# Sherborne Booking — array grid model v7

This version rebuilds the scheduler around a simple availability grid.

Core model:
- Four weeks of weekdays.
- Each day has half-hour cells from 08:00 to 20:00 in Michael's Outlook / UK diary time.
- Outlook calendar events are overlaid onto that grid.
- Busy, out-of-office, working-elsewhere and unknown items block a cell.
- Tentative items do not block a cell.
- Introductory consultation rules are then overlaid on top.
- The booking request sends the slot ID, and the server rebuilds the same grid before creating the diary hold.

Cloudflare settings remain:
- Build command: leave blank
- Build output directory: public

Private values stay in Cloudflare, not GitHub.
