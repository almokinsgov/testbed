# FNED In Page Notifications and Custom Messages

## Purpose

This bundle adds a lightweight notification layer that works while the dashboard tab is open.

It supports:

- RWAS alerts: MetService and Civil Defence warnings already loaded by rwas_region_warning.js
- Custom messages: a JSON file you control for staff messages and scheduled notices

Outputs:

- In page toasts (always available)
- Browser notifications using the Notification API (permission required)

## What Was Added

- fned_notifications.js
- files/fned_custom_messages_example.json
- runtimeConfig keys in v23_v32_split_js_v2.html

## How It Works

### RWAS Alerts

rwas_region_warning.js publishes a summary object to:

- window.FNED_RWAS_ALERT_SUMMARY

and also fires an event:

- fned:rwas-alerts-updated

fned_notifications.js listens for that event, dedupes new alerts and then shows toast and optional browser notifications.

### Custom Messages JSON

fned_notifications.js polls runtimeConfig.customMessages.url and reads:

- messages[] entries with id, title, body, start, end, channels

Active messages are:

- enabled is true
- start is not in the future if provided
- end is not in the past if provided

Active messages can:

- Render in the summary panel
- Trigger a toast
- Trigger a browser notification

## Enable Browser Notifications

Browser notifications require permission.

Options:

1. Use the page CTA button "Receive Notifications" and allow the prompt
2. Or use the browser console:

   - FNED_NOTIFICATIONS_API.requestPermission()

Then run a test:

- FNED_NOTIFICATIONS_API.test()

You can also request permission and send a test from the editor:

- Edit button, then CTA Row, then Notification Settings

## Editing The Custom Messages File

For local testing edit:

- files/fned_custom_messages_example.json

Key fields:

- id: stable unique id
- enabled: true or false
- start and end: ISO date time with timezone offset
- channels: summary, toast, notification

## Recommended Next Step

When you are ready for a backend, Google Apps Script is a good fit.

Common pattern:

- A sheet as the admin data source
- Apps Script publishes a public JSON endpoint
- The dashboard polls that JSON while open

This can later be upgraded into:

- A PWA service worker for background sync and push notifications

