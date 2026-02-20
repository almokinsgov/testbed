# PWA Install And iPhone Notifications

## What This Adds

FNED can now be installed as a Progressive Web App (PWA). This primarily helps iPhone and iPad users, because Safari only allows web notifications in installed Home Screen web apps.

This bundle does not include push notifications. The dashboard continues to poll RWAS warnings and custom messages while the app is open and shows toasts. Where supported, it can also show browser notifications.

## How iPhone Works

1. Open FNED in Safari
2. Tap Share
3. Tap Add to Home Screen
4. Open FNED from the Home Screen icon
5. Tap Receive Notifications and allow permission

If FNED is opened in a normal browser tab on iPhone, the Receive Notifications CTA will show Install For Notifications and will open the install help steps.

## Files Added

- manifest.json
- manifest.webmanifest (kept for reference)
- service-worker.js
- fned_pwa.js
- icons folder


## GitHub Pages Note

GitHub Pages does not always serve .webmanifest with an ideal content type. This bundle links to manifest.json for best compatibility with Chrome install detection.
## Service Worker Notes

- The service worker caches the app shell and local files for faster reload and basic offline support
- HTML requests use a network first strategy with cache fallback
- Other local GET requests use cache first with runtime caching

## Testing Checklist

Desktop
- Load v23_v32_split_js_v2.html and confirm no errors
- Open DevTools Application panel and confirm service worker is registered

iPhone
- Open the GitHub Pages URL in Safari and confirm it loads
- Add to Home Screen and open from the icon
- Tap Receive Notifications and confirm the permission prompt appears
- Trigger a test notification from the editor Notification Settings panel

If notifications are still not available on iPhone
- Confirm the app was launched from the Home Screen icon
- Confirm the site is https
- Confirm iOS version supports web push notifications
