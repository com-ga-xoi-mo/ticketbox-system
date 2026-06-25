## Why

The check-in staff mobile app currently "scans" tickets by typing the decoded QR
payload into a text field — a demo placeholder, not a usable gate workflow. Real
gate operation requires staff to point the phone camera at a ticket QR and have it
decoded automatically. The app already depends on `expo-camera`, so the gap is
purely in the scanner UI layer.

## What Changes

- Replace the manual `TextInput` payload entry in `ScannerScreen` with live camera
  QR scanning using `expo-camera`'s `CameraView`.
- **BREAKING (UX)**: Remove the manual payload-entry field entirely — the only scan
  input source becomes the camera. (Scanning now requires a physical device or an
  emulator with a virtual camera; iOS Simulator cannot scan.)
- Add camera-permission handling: request on first use, and render distinct
  `undetermined` / `denied` / `granted` UI states, with a recoverable path when the
  user denies access.
- Lock decode handling while a scan is `submitting` or showing a `result`, so the
  camera's continuous per-frame barcode events cannot trigger duplicate submissions.
- Declare the camera permission in `app.json` (expo-camera config plugin + iOS/Android
  permission strings).

The check-in business logic is untouched: `scan-workflow`, the offline queue, sync
service, ticket cache, and all backend endpoints stay exactly as-is. The camera only
produces the `qrPayload` string and feeds the existing `onDecodedPayload` callback.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `checkin-mobile-app`: The "QR scan UI foundation" requirement changes — the scan UI
  SHALL acquire decoded QR payloads from the device camera (with camera-permission
  states) instead of accepting an arbitrary manually entered payload, while preserving
  the existing in-flight duplicate-decode protection.

## Impact

- **Code**: `apps/checkin-mobile/src/features/scanner/ScannerScreen.tsx` (rewritten),
  new `QrCameraScanner.tsx` (thin `CameraView` wrapper), `scanner-screen-state.ts`
  (pure decode-lock helper + tests). `App.tsx` is unaffected — `ScannerScreen` keeps
  its current prop contract (`onDecodedPayload`, `onReset`, `onRetryInitialization`).
- **Config**: `apps/checkin-mobile/app.json` gains the `expo-camera` plugin and camera
  permission strings (iOS `NSCameraUsageDescription`, Android `CAMERA`).
- **Dependencies**: none added — `expo-camera ~17.0.10` is already installed.
- **Backend / queue / sync / cache**: no change.
- **Testing**: camera capture is not exercisable in Vitest; decode-lock logic is
  extracted into a pure, unit-tested helper, and the `CameraView` wrapper is a thin
  untested view. Manual verification requires a physical device.
