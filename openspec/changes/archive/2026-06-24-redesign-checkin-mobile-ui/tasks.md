## 1. Dependencies & provider

- [x] 1.1 Add `react-native-paper` and `expo-linear-gradient` to `apps/checkin-mobile/package.json` and install (use `npx expo install` versions compatible with Expo 54)
- [x] 1.2 Define a dark `MD3` Paper theme (small `src/theme/paper-theme.ts`) and wrap the app tree in `PaperProvider` in `App.tsx`

## 2. Login screen redesign

- [x] 2.1 Rebuild `LoginScreen.tsx` with a centered Paper `Card` over an `expo-linear-gradient` background, showing only: app name, email `TextInput`, password `TextInput`, Login `Button`
- [x] 2.2 Add a show/hide password toggle via `TextInput.Icon` (eye) backed by local state; keep the existing `onSubmit(email, password)` prop and error/blocked state rendering
- [x] 2.3 Verify `App.tsx` login wiring still passes `state` + `onSubmit` unchanged

## 3. Prominent scan-result banner

- [x] 3.1 Add a pure helper (e.g. in `scanner-screen-state.ts`) mapping a result/state to `{ visible, tone, message }` where tone ∈ success/neutral/error/warning
- [x] 3.2 Add Vitest tests for the mapper covering accepted/duplicate/invalid/unassigned/queued tones
- [x] 3.3 Render the result in `ScannerScreen.tsx` as a Paper `Banner` from the mapper; keep the manual "Scan another ticket" reset and the camera lock-while-result behavior

## 4. Mode-aware sync controls

- [x] 4.1 Add a pure predicate `shouldShowSyncControls({ online, pendingCount, failedCount })` (offline OR pending>0 OR failed>0) with Vitest tests
- [x] 4.2 Surface the current online/offline state to the sync panel (reuse the existing `NetworkMonitor`) and gate the three controls in `SyncStatusPanel.tsx`/`App.tsx` with the predicate
- [x] 4.3 Confirm automatic sync (on reconnect + 30s interval) is untouched and controls reappear when the queue is non-empty

## 5. Verification

- [x] 5.1 Run `npm run verify` (typecheck + vitest) in `apps/checkin-mobile` and ensure it passes
- [x] 5.2 Bundle on a device/Expo Go and visually verify: login card, scan banner colors, sync controls hidden online and shown offline/with queue
