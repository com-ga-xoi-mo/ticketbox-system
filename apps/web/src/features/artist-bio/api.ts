import {
  ArtistBioResponseSchema,
  type ArtistBioResponse,
  type RoleCode,
} from '@ticketbox/api-types';

import { ApiError, get, post } from '../../shared/api/client';
import { parseResponse } from '../../shared/api/parse-response';
import { encodeFileBase64, validateArtistBioPressKit } from './validation';

export type ArtistBioManagementRole = Extract<RoleCode, 'ADMIN' | 'ORGANIZER'>;

function basePath(role: ArtistBioManagementRole, concertId: string): string {
  return `/${role === 'ADMIN' ? 'admin' : 'organizer'}/concerts/${concertId}/artist-bio`;
}

export function createArtistBioApi(role: ArtistBioManagementRole) {
  async function uploadArtistBioPressKit(
    concertId: string,
    file: File,
  ): Promise<ArtistBioResponse> {
    await validateArtistBioPressKit(file);
    const data = await post<unknown>(basePath(role, concertId), {
      originalName: file.name,
      contentType: file.type,
      contentBase64: await encodeFileBase64(file),
    });
    return parseResponse(ArtistBioResponseSchema, data);
  }

  async function fetchArtistBio(concertId: string): Promise<ArtistBioResponse | null> {
    try {
      return parseResponse(ArtistBioResponseSchema, await get<unknown>(basePath(role, concertId)));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ARTIST_BIO_NOT_FOUND') return null;
      throw error;
    }
  }

  async function retryArtistBio(concertId: string, id: string): Promise<ArtistBioResponse> {
    return parseResponse(
      ArtistBioResponseSchema,
      await post<unknown>(`${basePath(role, concertId)}/${id}/retry`, {}),
    );
  }

  async function publishArtistBio(concertId: string, id: string): Promise<ArtistBioResponse> {
    return parseResponse(
      ArtistBioResponseSchema,
      await post<unknown>(`${basePath(role, concertId)}/${id}/publish`, {}),
    );
  }

  async function rejectArtistBio(concertId: string, id: string): Promise<ArtistBioResponse> {
    return parseResponse(
      ArtistBioResponseSchema,
      await post<unknown>(`${basePath(role, concertId)}/${id}/reject`, {}),
    );
  }

  return {
    uploadArtistBioPressKit,
    fetchArtistBio,
    retryArtistBio,
    publishArtistBio,
    rejectArtistBio,
  };
}
