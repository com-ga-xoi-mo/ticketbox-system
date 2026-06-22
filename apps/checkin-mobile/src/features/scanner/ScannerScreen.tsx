import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import type { StaffAssignment } from '../../api/checkin-mobile-api.types';
import type { ScanWorkflowState } from './scan-workflow';
import { canSubmitScan } from './scanner-screen-state';

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
  const [decodedPayload, setDecodedPayload] = useState('');
  const canSubmit = canSubmitScan(state);

  return (
    <View>
      {canSubmit ? <Text>Scanner ready for {assignment.concertTitle}</Text> : null}
      <TextInput
        editable={canSubmit}
        onChangeText={setDecodedPayload}
        placeholder="Decoded QR payload"
        value={decodedPayload}
      />
      <Button
        disabled={!canSubmit}
        onPress={() => {
          if (canSubmit) onDecodedPayload(decodedPayload);
        }}
        title="Submit scan"
      />
      {state.status === 'initializing' ? <Text>Initializing this installation...</Text> : null}
      {state.status === 'submitting' ? <Text>Submitting scan...</Text> : null}
      {state.status === 'result' ? <Text>{state.result.message}</Text> : null}
      {state.status === 'recoverable-error' ? <Text>{state.message}</Text> : null}
      {state.status === 'recoverable-error' ? (
        <Button onPress={onRetryInitialization} title="Retry initialization" />
      ) : null}
      {state.status === 'result' ? <Button onPress={onReset} title="Scan another ticket" /> : null}
    </View>
  );
}
