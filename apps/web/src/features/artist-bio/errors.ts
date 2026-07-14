import { ApiError } from '../../shared/api/client';
import { ArtistBioFileValidationError } from './validation';

export function artistBioErrorMessage(error: unknown): string {
  if (error instanceof ArtistBioFileValidationError) {
    return `File không hợp lệ (phải là PDF, không rỗng và không vượt quá 5 MB). ${error.message}`;
  }
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_PRESS_KIT') {
      return 'File không hợp lệ (phải là PDF, không rỗng và không vượt quá 5 MB).';
    }
    if (error.code === 'ARTIST_BIO_STATUS_TRANSITION') {
      return 'Không thể publish/reject ở trạng thái hiện tại.';
    }
    if (error.status === 403) return 'Bạn không có quyền với concert này.';
    if (error.code === 'ARTIST_BIO_NOT_FOUND') return 'Chưa có job tiểu sử nghệ sĩ.';
  }
  return 'Không thể xử lý tiểu sử nghệ sĩ lúc này. Vui lòng thử lại.';
}
