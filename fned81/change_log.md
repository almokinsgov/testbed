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

## Run 83

Fixed a JavaScript scoping bug that caused isIOSDevice to be undefined.

Changes include:

- Fixed a missing closing brace in getNotificationCtor that incorrectly scoped helper functions
- Removed an extra stray closing brace after isStandaloneMode
- Bumped fned_notifications.js to 0.1.2

## Run 84

Added PWA support so iPhone users can install FNED and then enable notifications.

Changes include:

- New manifest.webmanifest and icons folder
- New service-worker.js with app shell caching
- New fned_pwa.js helper that registers the service worker and provides install guidance
- Updated HTML head to include manifest, theme color, and apple touch icon
- Updated script order so fned_pwa.js loads before fned_notifications.js
- Updated notification CTA behaviour on iPhone: shows Install For Notifications and opens install help
- Added Install Help button and PWA status line in the editor notification settings
- Bumped fned_notifications.js to 0.1.3

## Run 85

Fixed GitHub Pages PWA install eligibility and improved iPhone Chrome install guidance.

Changes include:

- Added index.html as a stable PWA start_url entry point for GitHub Pages
- Updated manifest.webmanifest to use start_url "./" and include an id
- Fixed service-worker.js precache list to only include files that exist in this bundle (previous missing src paths caused install failures)
- Updated iOS detection logic so install guidance is shown on iPhone and iPad even when Notification is undefined in browser tabs
- Bumped service-worker.js and fned_notifications.js versions
