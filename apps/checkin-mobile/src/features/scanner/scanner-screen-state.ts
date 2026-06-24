import type { ScanWorkflowState } from './scan-workflow';

export function canSubmitScan(state: ScanWorkflowState): boolean {
  return state.status === 'ready';
}

export type BannerTone = 'success' | 'neutral' | 'warning' | 'error';

export interface ResultBanner {
  readonly visible: boolean;
  readonly tone: BannerTone;
  readonly title: string;
  readonly message: string;
}

const HIDDEN: ResultBanner = { visible: false, tone: 'neutral', title: '', message: '' };

/**
 * Pure mapping from the scan workflow state to a prominent result banner descriptor.
 * Keeps banner color (tone), title, and copy decisions unit-testable; the view only
 * renders it. The banner shows the ticket status only (no seat data, which the scan
 * result does not carry).
 */
export function resultBanner(state: ScanWorkflowState): ResultBanner {
  if (state.status === 'recoverable-error') {
    return { visible: true, tone: 'error', title: 'Error', message: state.message };
  }
  if (state.status !== 'result') {
    return HIDDEN;
  }
  const result = state.result;
  return {
    visible: true,
    tone: toneForResultStatus(result.status),
    title: titleForResultStatus(result.status),
    message: result.message,
  };
}

function toneForResultStatus(status: string): BannerTone {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'queued':
      return 'neutral';
    case 'duplicate':
      return 'warning';
    case 'invalid':
    case 'unassigned':
      return 'error';
    default:
      // Transport/service/unknown-commit and any unexpected status surface as errors.
      return 'error';
  }
}

function titleForResultStatus(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Ticket Valid';
    case 'queued':
      return 'Saved Offline';
    case 'duplicate':
      return 'Already Checked In';
    case 'invalid':
      return 'Invalid Ticket';
    case 'unassigned':
      return 'Not Authorized';
    default:
      return 'Scan Failed';
  }
}
