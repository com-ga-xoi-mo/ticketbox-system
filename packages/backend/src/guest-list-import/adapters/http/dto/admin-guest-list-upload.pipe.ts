import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import {
  AdminGuestListUploadRequestSchema,
  type AdminGuestListUploadRequest,
} from '@ticketbox/api-types';

@Injectable()
export class AdminGuestListUploadRequestPipe implements PipeTransform<
  unknown,
  AdminGuestListUploadRequest
> {
  transform(value: unknown): AdminGuestListUploadRequest {
    const parsed = AdminGuestListUploadRequestSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'INVALID_GUEST_LIST_UPLOAD',
        message: 'Invalid guest-list upload request',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
