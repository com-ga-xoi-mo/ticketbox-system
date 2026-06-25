## 1. Permission configuration

- [x] 1.1 Add the `expo-camera` config plugin to `apps/checkin-mobile/app.json` `plugins` with a Vietnamese `cameraPermission` string
- [x] 1.2 Add iOS `NSCameraUsageDescription` and Android `CAMERA` permission entries in `app.json`

## 2. Decode-accept rule (reuse existing pure helper)

- [x] 2.1 Reuse the existing `canSubmitScan(state)` in `scanner-screen-state.ts` as the decode-accept predicate (accept only when `ready`) — do not add a new helper
- [x] 2.2 Extend the existing `ScannerScreen.spec.ts` coverage if needed to assert the camera-gating intent (accept when `ready`; reject in `initializing`/`submitting`/`result`/`recoverable-error`)

## 3. Camera scanner component

- [x] 3.1 Create `QrCameraScanner.tsx` — a thin wrapper around `expo-camera` `CameraView` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`
- [x] 3.2 Add a synchronous `handlingRef` (`useRef` boolean) set the instant a decode is accepted and released when the workflow returns to `ready`, to close the prop-lag race window
- [x] 3.3 Wire `onBarcodeScanned` so it fires only when `canSubmitScan(state) && !handlingRef`, set to `undefined` otherwise, calling `onDecodedPayload(data)` once per accepted decode (data from `BarcodeScanningResult.data`)

## 4. ScannerScreen rewrite

- [x] 4.1 Replace the `TextInput`/manual submit UI in `ScannerScreen.tsx` with camera-based scanning; keep the existing prop contract (`onDecodedPayload`, `onReset`, `onRetryInitialization`)
- [x] 4.2 Add camera-permission handling via `useCameraPermissions()` rendering `undetermined` (request action), `denied` (recoverable + re-request/settings), and `granted` (render `QrCameraScanner`) branches
- [x] 4.3 Preserve existing workflow-state rendering (`initializing`, `submitting`, `result` + "Scan another ticket", `recoverable-error` + "Retry initialization")

## 5. Verification

- [x] 5.1 Confirm `App.tsx` requires no changes (prop contract unchanged)
- [x] 5.2 Run `npm run verify` (typecheck + vitest) in `apps/checkin-mobile` and ensure it passes
- [x] 5.3 Document manual device-based scan verification steps (physical device required; simulator/web cannot scan)
