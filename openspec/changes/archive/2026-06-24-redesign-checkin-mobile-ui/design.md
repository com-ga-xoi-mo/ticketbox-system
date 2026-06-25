## Context

`apps/checkin-mobile` has no design system: screens use raw RN `Button`/`TextInput`/`Text`
with a tiny inline `styles` object in `App.tsx`. There is no component library, theme
module, gradient, or icon set installed. The app is Expo (RN 0.81, React 19). The screen
components (`LoginScreen`, `ScannerScreen`, `SyncStatusPanel`) are already cleanly
separated from logic via props, and the camera change keeps `ScannerScreen`'s prop
contract stable — so a visual overhaul touches presentation only.

The user supplied a glassmorphism sign-in mockup but wants it simplified to: app name,
email field, password field, login button.

## Goals / Non-Goals

**Goals:**
- Adopt React Native Paper for consistent, prebuilt components instead of hand-styling.
- Redesign login to the simplified mockup using Paper `Card`/`TextInput`/`Button`.
- Make scan results a large, color-coded Paper `Banner`.
- Show the three sync controls only when actionable (offline or non-empty queue).

**Non-Goals:**
- No change to scan workflow, offline queue, sync service, ticket cache, or backend.
- No avatar, remember-me, forgot-password, or social-login on the login screen.
- No auto-advance after a scan — the manual "scan another ticket" action stays.
- No full visual theming of every screen beyond what these three areas need.

## Decisions

**1. React Native Paper + `PaperProvider` (dark theme) at the app root.**
Wrap the tree in `App.tsx` with a single `PaperProvider` using a dark `MD3` theme so all
Paper components inherit colors. *Alternative considered:* gluestack-ui/Tamagui — richer
but heavier config, overkill for three screens. Paper ships exactly the needed
components (`TextInput` with `right={<TextInput.Icon/>}` for show/hide, `Card`, `Button`,
`Banner`) and is Expo-friendly.

**2. Login background via `expo-linear-gradient`.**
A `LinearGradient` fills the screen behind a centered Paper `Card` to evoke the mockup's
gradient without faking glass blur (RN has no cheap backdrop-blur). Password field uses a
`secureTextEntry` toggled by a `TextInput.Icon` eye button held in local component state.

**3. Scan result rendered by a pure status→banner mapper.**
A pure helper maps a `ScanWorkflowState`/result to `{ visible, tone, message }` (tone ∈
success/neutral/error/warning) so the banner's color and copy are unit-testable under
Vitest; `ScannerScreen` only renders Paper `Banner` from it. The camera-lock and manual
reset behavior is unchanged from the camera change.

**4. Sync control visibility via a pure predicate.**
Add `shouldShowSyncControls({ online, pendingCount, failedCount })` to a pure helper,
unit-tested. `App.tsx`/`SyncStatusPanel` consume it to decide whether to render the
controls. Online state comes from the existing `NetworkMonitor` already wired for the
scan workflow; expose it to the panel. *Alternative considered:* gate purely on
`online` — rejected because staff must still be able to act on a non-empty queue that
hasn't drained yet even after reconnect.

## Risks / Trade-offs

- **[New dependencies / native modules]** Paper is JS-only but pulls
  `react-native-safe-area-context` (already present via Expo); `expo-linear-gradient` is
  an Expo module. → Mitigation: both are Expo-supported and work in Expo Go; verify a
  clean bundle on device after install.
- **[Mockup is glass, Paper is Material]** Exact glassmorphism isn't native to Paper. →
  Mitigation: approximate with a dark translucent card over the gradient; match the
  *spirit* (centered card, app name, two fields, button) per the user's simplification.
- **[Hiding sync controls could confuse]** A tester may expect the buttons always. →
  Mitigation: spec scenarios make the rule explicit (offline OR non-empty queue), and
  automatic sync is unaffected; controls reappear when actionable.
- **[Vitest can't render Paper]** → Mitigation: keep banner-tone and control-visibility
  decisions in pure helpers with tests; Paper JSX stays a thin untested view.

## Migration Plan

Additive UI change; no data migration. Install deps, add `PaperProvider`, restyle the
three screens. Rollback = revert the screen files + `App.tsx` wrapper and remove the two
dependencies. A fresh Expo bundle is needed after dependency install.
