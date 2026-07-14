## 1. Modify CreateOrderUseCase and Admission Port

- [x] 1.1 Add `consumeAndHoldSlot(input: { concertId: string; userId: string; holdTtlMinutes: number })` to `WaitingRoomAdmissionPort` and `WaitingRoomStorePort`.
- [x] 1.2 Implement `consumeAndHoldSlot` in `RedisWaitingRoomStore`: delete the user's admission token but update their score in the `active:${concertId}` ZSET to `now + holdTtlMinutes`.
- [x] 1.3 Implement `consumeAndHoldSlot` in `WaitingRoomAdmissionAdapter` and write tests.
- [x] 1.4 Update `CreateOrderUseCase`: replace `waitingRoomAdmissionPort.release` with `waitingRoomAdmissionPort.consumeAndHoldSlot` passing `this.reservationTtlMinutes`.
- [x] 1.5 Update unit tests for `CreateOrderUseCase`.

## 2. Add Release to Paid Order Flow

- [x] 2.1 Inject `WaitingRoomAdmissionPort` into `IssueTicketsForPaidOrderUseCase`.
- [x] 2.2 In `IssueTicketsForPaidOrderUseCase`, call `waitingRoomAdmissionPort.release` using `userId` and `concertId` extracted from the returned ticket plans (ignore any failures).
- [x] 2.3 Update unit tests for `IssueTicketsForPaidOrderUseCase`. to verify the release logic.
- [x] 2.4 Update `OrderModule` to provide `WaitingRoomAdmissionPort` to `IssueTicketsForPaidOrderUseCase` if needed.

## 3. Add Release to Cancel/Expire Flows

- [x] 3.1 Inject `WaitingRoomAdmissionPort` into `TransitionOrderStatusUseCase` (`packages/backend/src/ordering/application/use-cases/transition-order-status.use-case.ts`).
- [x] 3.2 Add `waitingRoomAdmissionPort.release` when an order transitions to `CANCELLED` or `EXPIRED`.
- [x] 3.3 Update unit tests.
- [x] 3.4 Update `OrderModule` to provide the dependency to these use cases.

## 4. Verification & E2E Testing

- [x] 4.1 Run unit tests `npm test` to ensure no broken assertions.
- [x] 4.2 Validate end-to-end flow: create an order (slot should still be held) -> pay the order (slot should be released).
