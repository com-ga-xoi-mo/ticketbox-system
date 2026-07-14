import type { VipLookupState } from './vip-lookup-state';

export interface VipLookupPresentation {
  readonly visible: boolean;
  readonly tone: 'success' | 'neutral' | 'warning' | 'error';
  readonly title: string;
  readonly message: string;
}

export function vipLookupPresentation(state: VipLookupState): VipLookupPresentation {
  switch (state.status) {
    case 'idle':
    case 'submitting':
      return { visible: false, tone: 'neutral', title: '', message: '' };
    case 'found':
      return {
        visible: true,
        tone: 'success',
        title: 'VIP found',
        message: state.guest.guestName,
      };
    case 'not-found':
      return {
        visible: true,
        tone: 'warning',
        title: 'VIP not found',
        message: 'No active VIP matches this value for the selected assignment.',
      };
    case 'offline':
      return { visible: true, tone: 'neutral', title: 'Online required', message: state.message };
    case 'authorization-error':
      return {
        visible: true,
        tone: 'error',
        title: 'Assignment not authorized',
        message: state.message,
      };
    case 'validation-error':
      return {
        visible: true,
        tone: 'warning',
        title: 'Check the lookup value',
        message: state.message,
      };
    case 'service-error':
      return { visible: true, tone: 'error', title: 'Service unavailable', message: state.message };
    case 'network-error':
      return { visible: true, tone: 'error', title: 'Network error', message: state.message };
    case 'invalid-response':
      return { visible: true, tone: 'error', title: 'Unexpected response', message: state.message };
  }
}
