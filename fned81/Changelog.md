# Run 77 - Marae clustering config tune (2 integration rounds)
Date: 2026-02-20

## Goal
Make Marae layer cluster more aggressively when zooming out and expose controls in runtime settings.

## Changes
1. Increased marae cluster defaults
- Base radius: 2200m
- Max radius: 60000m

2. Added adaptive viewport clustering setting
- New config: maraeClusterViewportWidthFactor (default 0.12)
- Effective radius now uses max(zoom-scaled radius, viewport width * factor)

3. Editor + config plumbing
- Added editor field for viewport width factor
- Added sanitizer support and bounds clamp (0..0.5)
- Added seeded default in HTML config

## Verification
- Reloaded live editor page on port 5500.
- Confirmed runtime values present on window.FNED_MAP_CFG and runtime constants.
- Existing external feed errors (HTTP 429) still present but unrelated.

## Operator guidance
If clustering is still too weak when zoomed out:
- Increase Marae Viewport Width Factor to  .16 or  .2.
- Optionally increase Marae Cluster Max Radius (meters) to 80000.

# Run 79 - Receive Notifications CTA and Editor Settings
Date: 2026-02-20

## Goal
Make the dashboard notification opt in visible for users and make notification settings editable inside the editor.

## Changes
1. CTA notification action
- Updated the first CTA button to "Receive Notifications"
- Added action notifications:enable

# Run 84 - PWA Install Support For iPhone Notifications
Date: 2026-02-21

## Goal
Allow FNED to be installed as a PWA so iPhone users can enable notifications in standalone mode.

## Changes
1. Added PWA assets
- manifest.webmanifest
- service-worker.js
- icons folder with 192, 512, and apple touch icon

2. Added PWA helper
- New fned_pwa.js registers the service worker and provides install guidance

3. Updated page wiring
- Added manifest and apple touch icon tags to the HTML head
- Loaded fned_pwa.js before fned_notifications.js

4. Improved iPhone notification UX
- CTA label becomes Install For Notifications on iPhone browser tabs
- CTA and editor can open install steps

## Verification
- Confirmed no JavaScript errors on load.
- Confirmed notification CTA updates label based on support and permission.
- CTA label auto updates based on permission state

2. Editor configuration
- Added notification settings section under the CTA Row module
- Added CTA Action dropdown with a notifications option

## Verification
- Confirmed the CTA action triggers FNED_NOTIFICATIONS_API.enableFromCta.
- Confirmed editor buttons call requestPermission and test.

## Run 80

- Added config migration for notifications CTA so saved configs do not keep the old label.

## Run 81

- Fixed mobile and non secure origin behaviour so Notification API calls never throw errors.
- Added secure origin detection (https or localhost) and improved feature detection.
- CTA now shows "Toasts Only" when browser notifications are unavailable.


## Run 82

- Added iPhone and iPad detection so browser notifications are treated as unavailable unless the dashboard is running as an installed Home Screen web app.
- Updated Notification constructor usage to rely on the detected Notification constructor, reducing edge case errors.
- Documentation updated with iOS requirements and toast fallback behaviour.

# Run 85 - GitHub Pages Install Fix and iPhone Chrome Guidance
Date: 2026-02-21

## Goal
Make PWA install detection reliable on GitHub Pages and ensure iPhone Chrome shows install guidance instead of a generic Notification API unavailable message.

## Changes
1. PWA entry and manifest compatibility
- Added index.html as a stable start_url
- Added manifest.json and updated HTML to link to it (GitHub Pages can serve .webmanifest with less compatible content types)
- Updated manifest start_url to "./" and added id

2. Notification support detection
- iOS install guidance now triggers before Notification API checks

3. Service worker
- Updated precache list to include index.html and manifest.json
- Version bumped to 0.1.1
