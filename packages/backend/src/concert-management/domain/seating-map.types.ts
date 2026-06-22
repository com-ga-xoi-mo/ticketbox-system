export type SeatingZoneStatusValue = 'ACTIVE' | 'INACTIVE';

export interface SeatingMapAsset {
  id: string;
  kind: string;
  status: string;
  storageKey: string;
  publicUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  uploadedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeatingZone {
  id: string;
  concertId: string;
  svgElementId: string;
  label: string;
  color: string | null;
  displayOrder: number;
  status: SeatingZoneStatusValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTypeZoneMappingResult {
  ticketTypeId: string;
  mappedZones: Array<{
    seatingZoneId: string;
    svgElementId: string;
    label: string;
  }>;
}

export interface UploadSeatingMapInput {
  concertId: string;
  userId: string;
  allowAdminOverride: boolean;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadSeatingMapResult {
  asset: SeatingMapAsset;
  concert: {
    id: string;
    seatingMapAssetId: string;
  };
}

export interface UpsertSeatingZoneInput {
  svgElementId: string;
  label: string;
  color?: string;
  displayOrder: number;
  status?: SeatingZoneStatusValue;
}

export interface UpdateTicketTypeZoneMappingsInput {
  concertId: string;
  ticketTypeId: string;
  userId: string;
  allowAdminOverride: boolean;
  seatingZoneIds: string[];
}
