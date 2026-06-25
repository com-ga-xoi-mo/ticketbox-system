import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Text, TouchableRipple } from 'react-native-paper';

import { ui } from '../../theme/paper-theme';
import type { OfflineScanEvent } from './offline-scan-queue.port';
import type { SyncServiceState } from './sync-service';

export interface SyncStatusPanelProps {
  readonly pendingCount: number;
  readonly failedEvents: readonly OfflineScanEvent[];
  readonly state: SyncServiceState;
  readonly online: boolean;
  readonly showControls: boolean;
  readonly onSync: () => void;
  readonly onClearSynced: () => void;
  readonly onClearTerminalResults: () => void;
}

export function SyncStatusPanel({
  pendingCount,
  failedEvents,
  state,
  online,
  showControls,
  onSync,
  onClearSynced,
  onClearTerminalResults,
}: SyncStatusPanelProps): React.JSX.Element {
  const syncing = state.status === 'syncing';

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.topRow}>
            <View style={styles.iconCircle}>
              <Icon source="sync" size={22} color={ui.primary} />
            </View>
            <View>
              <Text style={styles.smallMuted}>Pending Sync</Text>
              <Text style={styles.bigCount}>{pendingCount} Tickets</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.bottomRow}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: online ? ui.online : ui.textMuted }]} />
              <Text style={styles.statusText}>
                {online ? 'Online & Tracking' : 'Offline — scans queued'}
              </Text>
            </View>
            {showControls ? (
              <Button
                mode="contained"
                icon="sync"
                compact
                loading={syncing}
                disabled={syncing}
                onPress={onSync}
              >
                Force Sync
              </Button>
            ) : null}
          </View>

          {showControls && failedEvents.length > 0 ? (
            <View style={styles.failedBlock}>
              {failedEvents.map((event) => (
                <Text key={event.localId} style={styles.failedText}>
                  ⚠ {event.localId}: {event.failureReason ?? event.terminalStatus}
                </Text>
              ))}
            </View>
          ) : null}

          {showControls ? (
            <View style={styles.links}>
              <TouchableRipple onPress={onClearSynced} borderless>
                <Text style={styles.linkMuted}>Clear synced</Text>
              </TouchableRipple>
              <TouchableRipple onPress={onClearTerminalResults} borderless>
                <Text style={styles.linkDanger}>Clear terminal</Text>
              </TouchableRipple>
            </View>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: ui.label,
  },
  card: {
    borderRadius: 14,
    backgroundColor: ui.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallMuted: {
    fontSize: 12,
    color: ui.textMuted,
  },
  bigCount: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: ui.border,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: ui.textMuted,
  },
  failedBlock: {
    marginTop: 12,
    gap: 4,
  },
  failedText: {
    fontSize: 12,
    color: ui.danger,
  },
  links: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
  },
  linkMuted: {
    fontSize: 13,
    color: ui.textMuted,
    fontWeight: '600',
  },
  linkDanger: {
    fontSize: 13,
    color: ui.danger,
    fontWeight: '600',
  },
});
