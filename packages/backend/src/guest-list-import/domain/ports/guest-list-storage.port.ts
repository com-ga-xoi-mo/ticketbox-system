export const GUEST_LIST_STORAGE = Symbol('GuestListStoragePort');

export interface StoredGuestListObject {
  storageKey: string;
  sizeBytes: number;
}

export interface GuestListStoragePort {
  put(input: { key: string; content: Buffer; contentType: string }): Promise<StoredGuestListObject>;
  get(key: string): Promise<Buffer>;
}
