# Change Log

## Run 78

Added in page notification support while the dashboard tab is open.

Changes include:

- New fned_notifications.js script for RWAS alerts and custom messages
- New example custom message JSON file
- Added runtimeConfig keys for notifications and custom messages
- Updated RWAS alert objects to include stable ids and metadata for dedupe

## Run 79

Converted the Civil Defence alerts button into a notification opt in button and added notification configuration controls to the editor.

Changes include:

- CTA button now prompts for browser notification permission
- CTA button label auto updates based on permission state
- Added notification settings editor under the CTA Row module

## Run 80

Fixed an issue where older locally saved settings could keep showing the previous CTA label and hide the new notification action wiring.

Changes include:

- Added config sanitise defaults for runtimeConfig.notifications and runtimeConfig.customMessages
- Added migration logic so any legacy "Sign Up For Civil Defence Alerts" CTA is converted into the notifications permission CTA
- If no notifications CTA exists, a new "Receive Notifications" CTA is inserted automatically
- Updated validation to avoid warning about missing URLs for notification action buttons

## Run 81

Fixed mobile and non secure origin behaviour so the Notification API never throws errors and always falls back to toasts.

Changes include:

- Added secure origin detection for browser notifications (https or localhost)
- Improved Notification API feature detection to handle edge cases where Notification exists but is unusable
- Wrapped requestPermission to prevent unhandled promise rejections
- CTA now shows "Toasts Only" when browser notifications are unavailable and explains why via toast

## Run 82

- iOS gating: Treat browser notifications as unavailable unless running in standalone (Add to Home Screen).
- Hardened Notification constructor usage to avoid platform specific errors.
