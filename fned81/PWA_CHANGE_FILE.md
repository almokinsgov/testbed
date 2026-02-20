# PWA Change File

## Added Files

- manifest.webmanifest
- service-worker.js
- fned_pwa.js
- icons/icon-192.png
- icons/icon-512.png
- icons/apple-touch-icon-180.png

## Modified Files

### v23_v32_split_js_v2.html

Remove
- Nothing

Add
- PWA meta tags in the head (theme-color and iOS web app tags)
- Link tags for manifest and apple touch icon
- Script include for fned_pwa.js before fned_notifications.js

Change
- None

### fned_notifications.js

Remove
- Nothing

Add
- Support codes in browserNotificationSupport so the UI can differentiate iOS install requirements
- Public FNED_NOTIFICATIONS_API.toast helper so other modules can reuse the toast UI
- Public FNED_NOTIFICATIONS_API.getSupport helper for status panels and debugging

Change
- CTA label and behaviour on iPhone browser tabs now uses Install For Notifications and opens install help
- Version bumped to 0.1.3

### fned_module_editor.js

Remove
- Nothing

Add
- PWA status line in Notification Settings
- Install Help button in the notification action row

Change
- None

## Run 85 Updates

### Added Files

- index.html

### Modified Files

#### manifest.webmanifest

Remove
- start_url "./v23_v32_split_js_v2.html"

Add
- id "./"

Change
- start_url is now "./" so GitHub Pages root URL is installable

#### service-worker.js

Remove
- Precaching of non existent ./src/* files

Add
- Precaching for ./ and ./index.html

Change
- Version bumped to 0.1.1

#### fned_notifications.js

Change
- iOS install guidance now triggers before Notification API detection so iPhone Chrome tabs show install instructions instead of a generic unavailable message
- Version bumped to 0.1.4
