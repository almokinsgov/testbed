# Notifications Change File

## Overview

This change set adds in page notifications and a custom message polling system that works while the dashboard tab is open.

It is designed to be service worker ready later but it does not require a service worker yet.

## File Changes

## Run 79 Additions

This follow up adds a visible opt in button and editor controls.

### v23_v32_split_js_v2.html

Add

- runtimeConfig.notifications
- runtimeConfig.customMessages
- Script include for fned_notifications.js

Change

- Update the first CTA button to "Receive Notifications" with action notifications:enable
- CTA renderer now supports action hooks and binds notification actions to FNED_NOTIFICATIONS_API

No removals.

### rwas_region_warning.js

Change

- Add a stable id and metadata onto each combinedAlertList item

MetService items now include:

- id: CAP identifier
- title, startsAt, endsAt and link

Civil Defence items now include:

- id: CAP identifier
- title, startsAt, endsAt, cancelled and link

No removals.

### fned_notifications.js

Add

- New script that listens for RWAS alert updates
- New poller for custom messages JSON
- Toast UI and optional Notification API support
- Dedupe storage using localStorage

Change

- Add enableFromCta and CTA label syncing helpers
- Expose new API helpers for editor and CTA usage

### fned_module_editor.js

Change

- Add CTA button Action field with a notifications action option
- Add Notification Settings panel under the CTA Row module

### files/fned_custom_messages_example.json

Add

- Example message file for testing

### RUN_ME.txt

Change

- Add fned_notifications.js and fned_custom_messages_example.json to the runtime list

### Documentation

Add

- README_NOTIFICATIONS.md
- NOTIFICATIONS_CHANGE_FILE.md


## Run 80 Fix

This run fixes a common issue when older dashboard settings have been saved in localStorage.

Problem

- If a user saved an older config, the dashboard would keep the legacy CTA label and link because the saved config overrides the bundled defaults

Fix

### src/config/editor_config_utils.js

Change

- Add defaults for runtimeConfig.notifications and runtimeConfig.customMessages during config sanitise
- Add migration logic to convert any legacy "Sign Up For Civil Defence Alerts" CTA into the notifications action CTA
- If no notifications CTA exists, insert a new "Receive Notifications" CTA automatically
- Update validation so notification action buttons do not require a URL

## Run 81 Mobile And Secure Origin Guard

Problem

- On mobile or when testing over http using a local network IP address, browsers often block Notification API access.
- Some environments define Notification but throw errors when requesting permission.

Fix

### fned_notifications.js

Change

- Added secure origin detection (https or localhost) and improved Notification API feature detection
- Wrapped requestPermission so it never throws and never leaves unhandled promise rejections
- CTA now shows "Toasts Only" when browser notifications are unavailable and explains why via toast

## Run 83 Fix

### fned_notifications.js

Change

- Close getNotificationCtor correctly so helper functions are in the correct scope
- Remove an extra stray closing brace after isStandaloneMode
- Bump script version to 0.1.2
