import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { Button, Icon, Text } from 'react-native-paper';

import { ui } from '../../theme/paper-theme';
import type { StaffAssignment } from '../../api/checkin-mobile-api.types';
import type { ScanWorkflowState } from './scan-workflow';
import { QrCameraScanner } from './QrCameraScanner';
import { resultBanner, type BannerTone } from './scanner-screen-state';

export interface ScannerScreenProps {
  readonly assignment: StaffAssignment;
  readonly state: ScanWorkflowState;
  readonly onDecodedPayload: (qrPayload: string) => void;
  readonly onReset: () => void;
  readonly onRetryInitialization: () => void;
}

const TONE_COLOR: Record<BannerTone, string> = {
  success: ui.primary,
  neutral: '#475569',
  warning: ui.warning,
  error: ui.danger,
};

const TONE_ICON: Record<BannerTone, string> = {
  success: 'check-circle',
  neutral: 'cloud-check',
  warning: 'alert-circle',
  error: 'close-circle',
};

export function ScannerScreen({
  assignment,
  state,
  onDecodedPayload,
  onReset,
  onRetryInitialization,
}: ScannerScreenProps): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const banner = resultBanner(state);

  if (permission == null) {
    return <Text style={styles.muted}>Checking camera permission…</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Text variant="bodyLarge" style={styles.permissionText}>
          Camera access is required to scan ticket QR codes.
        </Text>
        {permission.canAskAgain ? (
          <Button mode="contained" onPress={() => void requestPermission()}>
            Grant camera access
          </Button>
        ) : (
          <Button mode="contained" onPress={() => void Linking.openSettings()}>
            Open settings
          </Button>
        )}
      </View>
    );
  }

  const showActions = state.status === 'result' || state.status === 'recoverable-error';

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <QrCameraScanner state={state} onDecodedPayload={onDecodedPayload} />

        {banner.visible ? (
          <View style={[styles.banner, { backgroundColor: TONE_COLOR[banner.tone] }]}>
            <Icon source={TONE_ICON[banner.tone]} size={36} color="#ffffff" />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerMessage}>{banner.message}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {state.status === 'submitting' ? (
        <Text style={styles.muted}>Submitting scan…</Text>
      ) : null}
      {state.status === 'initializing' ? (
        <Text style={styles.muted}>Initializing this installation…</Text>
      ) : null}

      {showActions ? (
        <Button
          mode="outlined"
          icon="line-scan"
          onPress={state.status === 'recoverable-error' ? onRetryInitialization : onReset}
          style={styles.scanAgain}
          contentStyle={styles.scanAgainContent}
        >
          {state.status === 'recoverable-error' ? 'Retry' : 'Scan another ticket'}
        </Button>
      ) : (
        <Text style={styles.ready}>Ready · {assignment.concertTitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  cameraWrap: {
    position: 'relative',
  },
  muted: {
    color: ui.textMuted,
  },
  ready: {
    textAlign: 'center',
    color: ui.textMuted,
    fontSize: 13,
  },
  permission: {
    gap: 12,
    paddingVertical: 24,
  },
  permissionText: {
    color: ui.textPrimary,
  },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  bannerMessage: {
    color: '#eaf0fe',
    fontSize: 13,
    marginTop: 2,
  },
  scanAgain: {
    borderRadius: 10,
    borderColor: ui.primary,
  },
  scanAgainContent: {
    paddingVertical: 4,
  },
});
