import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';

import type { ScanWorkflowState } from './scan-workflow';
import { canSubmitScan } from './scanner-screen-state';

export interface QrCameraScannerProps {
  readonly state: ScanWorkflowState;
  readonly onDecodedPayload: (qrPayload: string) => void;
}

/**
 * Thin wrapper around expo-camera's CameraView that forwards a decoded QR payload
 * exactly once per scan attempt.
 *
 * The camera emits onBarcodeScanned on every frame it sees a code. Gating purely on
 * `canSubmitScan(state)` is not enough: the `state` prop lags one React render behind
 * the workflow, so a few frames can still fire while it is stale. `handlingRef` is a
 * synchronous lock set the instant a decode is accepted and released only when the
 * workflow returns to `ready` (after a reset). The workflow's own non-`ready`
 * early-return remains a final backstop.
 */
export function QrCameraScanner({
  state,
  onDecodedPayload,
}: QrCameraScannerProps): React.JSX.Element {
  const handlingRef = useRef(false);
  const ready = canSubmitScan(state);

  useEffect(() => {
    if (ready) {
      handlingRef.current = false;
    }
  }, [ready]);

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          ready && !handlingRef.current
            ? ({ data }) => {
                handlingRef.current = true;
                onDecodedPayload(data);
              }
            : undefined
        }
      />
      <View pointerEvents="none" style={styles.reticle}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
    </View>
  );
}

const RETICLE = '#3b82f6';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#0f172a',
  },
  reticle: {
    ...StyleSheet.absoluteFillObject,
    margin: 18,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: RETICLE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
});
