import { VipLookupRequestSchema, type VipLookupResponse } from '@ticketbox/api-types';

import type {
  MobileSession,
  StaffAssignment,
  VipLookupApiClient,
  VipLookupType,
} from '../../api/checkin-mobile-api.types';

type VipGuest = Extract<VipLookupResponse, { status: 'found' }>['guest'];

export interface VipLookupInput {
  readonly lookupType: VipLookupType;
  readonly value: string;
}

export interface VipLookupContext {
  readonly session: MobileSession;
  readonly assignment: StaffAssignment;
  readonly online: boolean;
}

export type VipLookupState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting' }
  | { readonly status: 'found'; readonly guest: VipGuest }
  | { readonly status: 'not-found' }
  | { readonly status: 'offline'; readonly message: string }
  | { readonly status: 'authorization-error'; readonly message: string }
  | { readonly status: 'validation-error'; readonly message: string }
  | { readonly status: 'service-error'; readonly message: string }
  | { readonly status: 'network-error'; readonly message: string }
  | { readonly status: 'invalid-response'; readonly message: string };

export class VipLookupController {
  constructor(private readonly api: VipLookupApiClient) {}

  async lookup(input: VipLookupInput, context: VipLookupContext): Promise<VipLookupState> {
    if (!context.online) {
      return { status: 'offline', message: 'VIP lookup requires an online connection.' };
    }
    const request = VipLookupRequestSchema.safeParse({
      assignmentId: context.assignment.assignmentId,
      concertId: context.assignment.concertId,
      gate: context.assignment.gate,
      lookupType: input.lookupType,
      value: input.value,
    });
    if (!request.success) {
      return {
        status: 'validation-error',
        message: request.error.issues[0]?.message ?? 'Invalid VIP lookup value.',
      };
    }
    try {
      const result = await this.api.lookupVipGuest(context.session.accessToken, request.data);
      switch (result.status) {
        case 'found':
          return { status: 'found', guest: result.guest };
        case 'not_found':
          return { status: 'not-found' };
        case 'unauthorized':
          return { status: 'authorization-error', message: result.message };
        case 'request-error':
          return { status: 'validation-error', message: result.message };
        case 'service-error':
          return { status: 'service-error', message: result.message };
        case 'transport-error':
          return { status: 'network-error', message: result.message };
        case 'invalid-response':
          return { status: 'invalid-response', message: result.message };
      }
    } catch (error) {
      return {
        status: 'network-error',
        message: error instanceof Error ? error.message : 'VIP lookup failed.',
      };
    }
  }

  reset(): VipLookupState {
    return { status: 'idle' };
  }
}

export function canSubmitVipLookup(online: boolean, state: VipLookupState, value: string): boolean {
  return online && state.status !== 'submitting' && value.trim().length > 0;
}
