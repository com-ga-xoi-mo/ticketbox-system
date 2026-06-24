## Why

The check-in staff mobile app currently renders every screen with raw React Native
primitives (`Button`, `TextInput`, bare `Text`) and ad-hoc inline styles. The login
screen is an unstyled stack of fields, scan results are a single small line of text
that's easy to miss at a busy gate, and the three offline-sync maintenance buttons are
always visible — including when the device is online and they do nothing useful. The
result is hard to read at arm's length and looks unfinished. Adopting a real component
library lets us ship a polished, consistent UI without hand-rolling a design system.

## What Changes

- Add **React Native Paper** as the mobile UI component library and wrap the app in a
  dark-themed `PaperProvider`. Add **expo-linear-gradient** for the login background.
- **Login screen redesign**: a centered card (Paper `Card`) showing only the app name,
  an email `TextInput`, a password `TextInput` with a show/hide toggle, and a Login
  `Button` — modeled on the provided mockup but deliberately simplified (no avatar,
  remember-me, forgot-password, or social-login elements).
- **Prominent scan-result banner**: after a scan resolves, show the result as a large,
  color-coded Paper `Banner` (accepted / duplicate / invalid / unassigned / queued)
  instead of a small text line. The manual "Scan another ticket" action is **kept** —
  no auto-advance.
- **Mode-aware sync controls**: the three sync maintenance buttons (Sync pending scans,
  Clear synced scans, Clear terminal results) are **hidden while online** and shown only
  when the device is offline or there are queued/failed events to act on.

This is a client-side presentation change only. `scan-workflow`, the offline queue, the
sync service, the ticket cache, and all backend endpoints are unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `checkin-mobile-app`: the QR scan result presentation requirement is refined so a
  resolved scan is surfaced as a prominent, status-distinct banner (the manual
  "scan another" reset is retained). Login remains functionally identical; only its
  presentation changes (no requirement change).
- `checkin-offline-sync`: the "Sync status UI" requirement is refined so the manual
  sync trigger and clear actions are presented only when actionable (offline mode or
  pending/failed events present), rather than always visible.

## Impact

- **Code**: `apps/checkin-mobile/App.tsx` (PaperProvider wrapper, gradient, sync-panel
  visibility gating), `src/features/auth/LoginScreen.tsx`, `src/features/scanner/
  ScannerScreen.tsx` (banner), `src/features/offline-queue/SyncStatusPanel.tsx`
  (mode-aware controls). A small shared theme module may be added.
- **Dependencies**: add `react-native-paper` and `expo-linear-gradient` (and Paper's
  peer `react-native-safe-area-context`, already used via Expo). No backend changes.
- **Behavior preserved**: scan logic, queue, sync, cache, and backend untouched; the
  sync capability still exists — only its on-screen visibility changes.
- **Testing**: pure presentation; Paper components aren't unit-tested under Vitest. Any
  new visibility/branching logic is extracted into pure helpers with Vitest coverage,
  consistent with the existing scanner/sync helpers. Manual verification on a device.
