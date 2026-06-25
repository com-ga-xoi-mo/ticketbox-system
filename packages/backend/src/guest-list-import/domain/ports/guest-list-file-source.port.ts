export const GUEST_LIST_FILE_SOURCE = Symbol('GuestListFileSourcePort');

export interface GuestListFileCandidate {
  concertId: string;
  sourceName: string;
  absolutePath: string;
  contentType: string;
}

export interface GuestListFileSourcePort {
  discover(): Promise<GuestListFileCandidate[]>;
  read(candidate: GuestListFileCandidate): Promise<Buffer>;
  archive(candidate: GuestListFileCandidate, checksum: string): Promise<void>;
}
