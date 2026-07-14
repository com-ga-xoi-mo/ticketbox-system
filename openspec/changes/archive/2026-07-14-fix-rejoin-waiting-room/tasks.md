## 1. Update UI for Rejoining Waiting Room

- [x] 1.1 In `apps/audience-web/src/features/checkout/CheckoutPage.tsx`, locate the primary action button inside the waiting room UI branch.
- [x] 1.2 Change the `disabled` property so that the button is NOT disabled when `waitingRoomStatus.status === 'NOT_JOINED'`.
- [x] 1.3 Ensure the button text says "Vào lại phòng chờ" when `status === 'NOT_JOINED'`.
- [x] 1.4 Test the flow by joining the waiting room, clicking "Rời phòng chờ", and then clicking "Vào lại phòng chờ".
