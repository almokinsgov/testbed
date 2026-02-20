# Single Source Of Truth

## Dashboard Entry Point

- v23_v32_split_js_v2.html

CTA notifications hook:

- #fned-cta-notifications
- data-fned-action="notifications:enable"

## Alert Sources

- rwas_region_warning.js

Outputs:

- window.FNED_RWAS_ALERT_SUMMARY
- Event fned:rwas-alerts-updated

## Notifications Layer

- fned_notifications.js

Uses:

- runtimeConfig.notifications
- runtimeConfig.customMessages

Editor integration:

- Notification settings are edited under the CTA Row module in the editor drawer

## Custom Message Data

- files/fned_custom_messages_example.json

## Run 80 Note

- Config sanitise now migrates legacy CTA labels to the notifications action so older saved configs stay compatible.

## Run 81 Note

- Browser notifications are only enabled on secure origins (https or localhost). On mobile testing over http local IP the system falls back to toasts only.
