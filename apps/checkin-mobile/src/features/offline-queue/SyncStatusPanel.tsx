import React from 'react';
import { Button, Text, View } from 'react-native';

import type { OfflineScanEvent } from './offline-scan-queue.port';
import type { SyncServiceState } from './sync-service';
import { PendingQueueBadge } from './PendingQueueBadge';

export interface SyncStatusPanelProps {
  readonly pendingCount: number;
  readonly failedEvents: readonly OfflineScanEvent[];
  readonly state: SyncServiceState;
  readonly onSync: () => void;
  readonly onClearSynced: () => void;
  readonly onClearTerminalResults: () => void;
}

export function SyncStatusPanel({
  pendingCount,
  failedEvents,
  state,
  onSync,
  onClearSynced,
  onClearTerminalResults,
}: SyncStatusPanelProps): React.JSX.Element {
  return (
    <View>
      <PendingQueueBadge count={pendingCount} />
      {state.status === 'syncing' ? <Text>Sync in progress…</Text> : null}
      {state.lastSyncAt ? <Text>Last sync: {state.lastSyncAt}</Text> : null}
      <Text>
        Results: {state.counts.accepted} accepted, {state.counts.duplicate} duplicate,{' '}
        {state.counts.invalid} invalid, {state.counts.conflict} conflict,{' '}
        {state.counts.unassigned} unassigned
      </Text>
      {state.message ? <Text>{state.message}</Text> : null}
      {failedEvents.map((event) => (
        <Text key={event.localId}>
          {event.localId}: {event.failureReason ?? event.terminalStatus}
        </Text>
      ))}
      <Button disabled={state.status === 'syncing'} onPress={onSync} title="Sync pending scans" />
      <Button onPress={onClearSynced} title="Clear synced scans" />
      <Button onPress={onClearTerminalResults} title="Clear terminal results" />
    </View>
  );
}
