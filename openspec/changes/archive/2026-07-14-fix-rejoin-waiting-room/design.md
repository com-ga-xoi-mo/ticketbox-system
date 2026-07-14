## Context

Currently, in `CheckoutPage.tsx`, when a user leaves the waiting room, their local state is updated to `{ active: true, status: 'NOT_JOINED' }`. However, the main action button ("Tiếp tục đặt vé") has a disabled condition that checks if the status is not `'ADMITTED'` or if `admissionToken` is missing. This prevents the user from clicking the button to re-join the queue, resulting in a dead end.

## Goals / Non-Goals

**Goals:**
- Allow users who have left the waiting room (`status === 'NOT_JOINED'`) to re-join by clicking the primary action button.
- The button text should correctly reflect the available action: "Vào lại phòng chờ" when not joined, and "Tiếp tục đặt vé" when admitted.

**Non-Goals:**
- Changing any backend logic or virtual waiting room requirements.

## Decisions

- **UI State Check**: Update the `disabled` property of the main button. It should be disabled if `isSubmitting` is true, or if the user is currently `QUEUED`, or if they are `ADMITTED` but have no token. It should be enabled if they are `NOT_JOINED`.
- **Button Text**: Use a ternary operator to show "Vào lại phòng chờ" when `status === 'NOT_JOINED'` and "Tiếp tục đặt vé" otherwise.

## Risks / Trade-offs

- Minimal risk as this is a localized UI fix.
