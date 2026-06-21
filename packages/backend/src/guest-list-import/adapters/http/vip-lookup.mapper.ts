import { VipLookupResponseSchema, type VipLookupResponse } from '@ticketbox/api-types';
export function toVipLookupResponse(value: unknown): VipLookupResponse {
  return VipLookupResponseSchema.parse(value);
}
