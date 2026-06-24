import React from 'react';
import { Button, Linking, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

import type { StaffAssignment } from '../../api/checkin-mobile-api.types';
import type { ScanWorkflowState } from './scan-workflow';
import { QrCameraScanner } from './QrCameraScanner';

export interface ScannerScreenProps {
  readonly assignment: StaffAssignment;
  readonly state: ScanWorkflowState;
  readonly onDecodedPayload: (qrPayload: string) => void;
  readonly onReset: () => void;
  readonly onRetryInitialization: () => void;
}

export function ScannerScreen({
  assignment,
  state,
  onDecodedPayload,
  onReset,
  onRetryInitialization,
}: ScannerScreenProps): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();

  return (
    <View>
      {permission == null ? <Text>Checking camera permission…</Text> : null}

      {permission != null && !permission.granted ? (
        <View>
          <Text>Camera access is required to scan ticket QR codes.</Text>
          {permission.canAskAgain ? (
            <Button onPress={() => void requestPermission()} title="Grant camera access" />
          ) : (
            <Button onPress={() => void Linking.openSettings()} title="Open settings" />
          )}
        </View>
      ) : null}

      {permission?.granted ? (
        <View>
          {state.status === 'ready' ? (
            <Text>Scanner ready for {assignment.concertTitle}</Text>
          ) : null}
          <QrCameraScanner state={state} onDecodedPayload={onDecodedPayload} />
          {state.status === 'initializing' ? (
            <Text>Initializing this installation…</Text>
          ) : null}
          {state.status === 'submitting' ? <Text>Submitting scan…</Text> : null}
          {state.status === 'result' ? <Text>{state.result.message}</Text> : null}
          {state.status === 'recoverable-error' ? <Text>{state.message}</Text> : null}
          {state.status === 'recoverable-error' ? (
            <Button onPress={onRetryInitialization} title="Retry initialization" />
          ) : null}
          {state.status === 'result' ? (
            <Button onPress={onReset} title="Scan another ticket" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
