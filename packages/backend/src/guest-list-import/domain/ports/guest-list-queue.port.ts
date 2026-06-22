export const GUEST_LIST_QUEUE = Symbol('GuestListQueuePort');

export interface GuestListQueuePort {
  ensureImportJob(batchId: string): Promise<void>;
}
