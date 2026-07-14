## Why

When a user clicks "Rời phòng chờ" (Leave Waiting Room), they are removed from the waiting room and their status becomes `NOT_JOINED`. However, the UI currently disables the primary button and fails to let the user re-join the waiting room. The button should light up and allow the user to click "Vào lại phòng chờ" to rejoin the queue.

## What Changes

- Update the disabled state condition on the primary action button in `CheckoutPage.tsx` to ensure it is clickable when the status is `NOT_JOINED`.
- Ensure the button text correctly displays "Vào lại phòng chờ" when the user is in the `NOT_JOINED` state.
- Keep the button disabled only when the user is actually queued (`status === 'QUEUED'`) or processing a submission.

## Capabilities

### New Capabilities
None

### Modified Capabilities
None (This is purely a frontend bug fix and does not alter system requirements).

## Impact

- `apps/audience-web/src/features/checkout/CheckoutPage.tsx`
