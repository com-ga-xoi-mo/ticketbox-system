import type { ScanWorkflowState } from './scan-workflow';

export function canSubmitScan(state: ScanWorkflowState): boolean {
  return state.status === 'ready';
}
