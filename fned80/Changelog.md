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
- CTA label auto updates based on permission state

2. Editor configuration
- Added notification settings section under the CTA Row module
- Added CTA Action dropdown with a notifications option

## Verification
- Confirmed the CTA action triggers FNED_NOTIFICATIONS_API.enableFromCta.
- Confirmed editor buttons call requestPermission and test.

## Run 80

- Added config migration for notifications CTA so saved configs do not keep the old label.

