export class GuestListValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class GuestListBatchNotFoundError extends Error {}
export class GuestListBatchBusyError extends Error {}
export class GuestListBatchOutOfOrderError extends Error {}
export class GuestListAccessDeniedError extends Error {}

export class GuestListBatchNotCompletedError extends Error {
  constructor(
    public readonly batchId: string,
    public readonly batchStatus: string,
  ) {
    super(
      `Cannot retrieve report: batch ${batchId} has status ${batchStatus}`,
    );
  }
}
