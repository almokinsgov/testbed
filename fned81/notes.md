# Notes

## Notifications Scope

This implementation is designed for the current need:

- Show alerts and messages while the page is open

It does not attempt background processing, background timers, or push notifications.

## Notification Permissions

Browser notifications require:

- Notification API support
- User permission
- A secure context such as https or localhost

Mobile testing note

If you open the dashboard on a phone using a local network address like http://192.168.x.x the page is not a secure context, so browser notifications will be unavailable. FNED will continue to show in page toasts and scheduled messages.

If permission is not granted, the system will still show toasts.

## Receive Notifications CTA Button

The first CTA button has an action hook:

- action: notifications:enable

When clicked:

- It requests notification permission
- It updates the button label to show the current state

States:

- Receive Notifications
- Notifications Enabled
- Notifications Blocked

## Dedupe Behavior

To avoid repeated alerts, the system stores seen ids in localStorage.

Keys:

- fned_notify_seen_alerts_v1
- fned_notify_seen_messages_v1

The window is controlled by:

- dedupeWindowHours

## Custom Messages Scheduling

Scheduling is time window based.

A message is active if:

- enabled is true
- start is not in the future if provided
- end is not in the past if provided

If you need exact minute scheduling, this same structure still works. You just set start and end tightly.

## Saved Settings Migration

If you previously saved dashboard settings in this browser, the dashboard loads those values from localStorage.

Run 80 adds a migration step during config sanitise so older saved configs are updated automatically. This ensures the bell CTA becomes "Receive Notifications" and it is wired to the notification permission action.

## iPhone and iPad

- iOS requires Add to Home Screen for system notifications. In normal browser tabs FNED uses toasts only.

## Run 83 Notes

- iOS browser tabs will use toasts only.
- isIOSDevice and isStandaloneMode helpers are now correctly in the top level FNED notifications scope.
