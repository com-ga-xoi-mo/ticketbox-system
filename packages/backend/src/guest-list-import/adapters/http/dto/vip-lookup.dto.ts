import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { VipLookupRequestSchema, type VipLookupRequest } from '@ticketbox/api-types';

@Injectable()
export class VipLookupRequestPipe implements PipeTransform<unknown, VipLookupRequest> {
  transform(value: unknown): VipLookupRequest {
    const parsed = VipLookupRequestSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException('Invalid VIP lookup request');
    return parsed.data;
  }
}
