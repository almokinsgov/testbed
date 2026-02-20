# Handover Log

## Run 78

What was delivered

- Toast and optional browser notification system for RWAS alerts
- Polling and rendering of a custom messages JSON file
- Example JSON to test custom messages

How to test quickly

1. Serve the folder with VS Code Live Server
2. Open v23_v32_split_js_v2.html
3. In the browser console run FNED_NOTIFICATIONS_API.requestPermission()
4. Run FNED_NOTIFICATIONS_API.test()
5. Edit files/fned_custom_messages_example.json time windows and refresh

Next work ideas

- Add a small UI button in the module editor for requesting notification permission
- Replace the example JSON with a published JSON endpoint from Google Apps Script
- Later upgrade to a PWA service worker for background polling and push notifications

## Run 79

What was delivered

- Replaced the CTA "Sign Up" button with a "Receive Notifications" permission prompt action
- Added notification and custom message settings inside the editor under the CTA Row module

How to test quickly

1. Serve the folder with VS Code Live Server
2. Open v23_v32_split_js_v2.html
3. Click "Receive Notifications" and allow the permission prompt
4. Use the editor CTA Row module to run "Send Test Notification"
5. Edit files/fned_custom_messages_example.json time windows and refresh

## Run 80

What was delivered

- Automatic migration of older saved configs so the notifications CTA and settings appear correctly

How to test quickly

1. Serve the folder with VS Code Live Server
2. Open v23_v32_split_js_v2.html
3. If you previously saved settings, refresh and confirm the CTA now reads "Receive Notifications"
4. Open the editor, select "Action Buttons", then confirm "Notification Settings" is visible
5. Click "Send Test Notification"

## Run 81

What was delivered

- Fixed Notification API edge cases on mobile and non secure origins so the dashboard never throws Notification errors
- Added secure origin detection (https or localhost) and improved feature detection
- CTA shows "Toasts Only" when browser notifications are unavailable

How to test quickly

1. Open the dashboard on a phone via a local IP address (http). Confirm that toasts still work.
2. Click the notifications CTA. Confirm it explains the HTTPS requirement and does not throw console errors.
3. Test on https or localhost and confirm the permission prompt works.

## Run 82 Handover

- Issue: iPhone (Chrome on iOS) reports notifications not supported and can throw Notification API errors.
- Fix: fned_notifications.js now detects iOS and requires standalone mode for browser notifications. Otherwise FNED uses toasts only.
- Operator: For iOS system notifications, users must Add to Home Screen and open from the icon.

## Run 83 Handover

- Issue: isIOSDevice is not defined error on iPhone test.
- Cause: Missing brace in fned_notifications.js placed isIOSDevice inside getNotificationCtor, plus an extra stray closing brace.
- Fix: Closed getNotificationCtor correctly and removed the stray brace. Notification support now correctly falls back to toasts on iOS non standalone.

## Run 84 Handover

What was delivered

- FNED PWA install support (manifest, icons, service worker)
- PWA helper module (fned_pwa.js) that registers the service worker and provides install help UI
- iPhone friendly notification CTA behaviour, plus an Install Help button in the editor

How to test quickly

Desktop

1. Serve the folder with VS Code Live Server
2. Open v23_v32_split_js_v2.html
3. In DevTools Application, confirm the service worker is registered and the manifest is detected

iPhone

1. Open the GitHub Pages URL in Safari
2. Add to Home Screen and open from the icon
3. Tap Receive Notifications and allow permission
4. Use editor Notification Settings and click Send Test Notification

Notes

- This run does not include push notifications. It supports notifications while the app is open.

## Run 85 Handover

Key focus
- Fix PWA install prompt not appearing on GitHub Pages
- Ensure iPhone Chrome shows install guidance instead of Notification API errors

Changes
- Added index.html and updated manifest to start_url "./"
- Added manifest.json and updated HTML to use it
- Updated service worker cache list and version
- Updated fned_notifications iOS support detection order

Next
- If you want a visible Install button, add a CTA action to call FNED_PWA_API.promptInstall()
- Consider adding a small PWA status tile in the header for staff testing
