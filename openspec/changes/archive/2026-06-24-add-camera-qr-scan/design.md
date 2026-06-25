## Context

`ScannerScreen` currently fakes scanning with a `TextInput`: staff type the decoded
QR payload and tap "Submit scan". The whole check-in pipeline downstream of that
callback — `ScanWorkflow.submitDecodedPayload`, the offline SQLite queue, the sync
service, and the ticket cache — is already implemented and treats the payload as an
opaque string. The single seam between UI and logic is the `onDecodedPayload(payload:
string)` prop on `ScannerScreen`, wired in `App.tsx`.

`expo-camera ~17.0.10` is already a dependency but unused, and `app.json` does not yet
declare camera permission. The project enforces a Vitest verify gate, but native
camera capture cannot run under Vitest.

## Goals / Non-Goals

**Goals:**
- Decode ticket QR codes live from the device camera and feed the existing
  `onDecodedPayload` callback.
- Handle camera-permission states (undetermined / denied / granted) with a recoverable
  path on denial.
- Prevent the camera's continuous per-frame decode events from causing duplicate
  submissions.
- Keep `ScannerScreen`'s prop contract stable so `App.tsx` and the workflow are untouched.

**Non-Goals:**
- No change to check-in business logic, offline queue, sync, ticket cache, or backend.
- No QR-content validation on-device (server remains the authority).
- No manual payload-entry fallback (removed entirely).
- No torch/flashlight, multi-camera switching, or scan-region overlay tuning beyond a
  basic framing guide (can come later).

## Decisions

**1. Camera lives in a thin `QrCameraScanner.tsx`; the decode-accept rule reuses the
existing pure helper.**
`QrCameraScanner` is a minimal wrapper around `expo-camera`'s `CameraView` with
`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` and an `onBarcodeScanned` handler.
The "is a decode acceptable right now?" decision already exists as the pure,
unit-tested `canSubmitScan(state)` in `scanner-screen-state.ts` (returns true only when
the workflow is `ready`) — the camera handler reuses it rather than introducing a new
helper. *Alternative considered:* a brand-new lock helper — rejected as redundant;
`canSubmitScan` is exactly this predicate and is already covered by
`ScannerScreen.spec.ts`.

**2. Decode-lock is a synchronous in-component ref, with the `ready` state prop as the
outer gate.**
Gating `onBarcodeScanned` solely on `canSubmitScan(propState)` is insufficient: the
`state` prop lags one React render behind the workflow. The flow is `decode →
submitDecodedPayload()` (which sets the workflow to `submitting` *synchronously*) `→
setScanState(...) → re-render`. Between the decode and that re-render the camera can
emit one or more additional frames while the prop is still `ready`, so a pure
prop-based gate has a race window. `QrCameraScanner` therefore holds a synchronous
`handlingRef` (a `useRef` boolean) set the instant a decode is accepted and released
only when the workflow returns to `ready` (via `onReset` / a `ready`-state effect). The
handler fires `onDecodedPayload(data)` only when `canSubmitScan(state) && !handlingRef`.
The existing `submitDecodedPayload` early-return on non-`ready` state remains a third
backstop, so no duplicate submission can reach the workflow even if a frame slips
through. *Alternative considered:* a time-based debounce only — rejected as the primary
mechanism because a fixed delay is both racy and arbitrary; the synchronous ref is
exact. A short debounce may still be layered on top to coalesce same-frame bursts, but
it is not the lock.

**3. Permission via `useCameraPermissions()` with three rendered branches.**
`undetermined` → request button; `denied` → recoverable message + re-request/settings
action; `granted` → render `QrCameraScanner`. This mirrors the spec's three scenarios
and reuses the existing `recoverable-error` visual affordances.

**4. Permission declared via the expo-camera config plugin in `app.json`.**
Add `["expo-camera", { cameraPermission: "<vi string>" }]` to `plugins`, plus explicit
iOS `NSCameraUsageDescription` and Android `CAMERA` permission. Required for a native
build to access the camera at all.

## Risks / Trade-offs

- **[No simulator/web testing path]** Removing manual entry means the scan flow can no
  longer be exercised on iOS Simulator or web. → Mitigation: keep all testable logic in
  the pure helper (covered by Vitest); document that end-to-end scan verification needs
  a physical device or an Android emulator with a virtual camera. Aligns with the
  existing physical-device run notes.
- **[Camera over-fires decodes]** `CameraView` calls `onBarcodeScanned` every frame it
  sees a code. → Mitigation: state-gated handler (Decision 2) plus optional short
  debounce; the workflow's own `ready`-guard backstops it.
- **[Permission denied permanently]** On some platforms a hard denial can't be
  re-prompted in-app. → Mitigation: the denied branch offers an "open settings" path and
  stays recoverable rather than dead-ending.

## Migration Plan

Additive UI change behind the same prop contract; no data migration. Rollback = revert
the scanner files and the `app.json` plugin entry. A native rebuild is required for the
permission change to take effect (config-plugin change, not OTA-updatable).
