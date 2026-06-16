import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import type { StaffAssignment } from '../../api/checkin-mobile-api.types';
import type { ScanWorkflowState } from './scan-workflow';

export interface ScannerScreenProps {
  readonly assignment: StaffAssignment;
  readonly state: ScanWorkflowState;
  readonly onDecodedPayload: (qrPayload: string) => void;
  readonly onReset: () => void;
}

export function ScannerScreen({
  assignment,
  state,
  onDecodedPayload,
  onReset,
}: ScannerScreenProps): React.JSX.Element {
  const [decodedPayload, setDecodedPayload] = useState('');

  return (
    <View>
      <Text>Scanner ready for {assignment.concertTitle}</Text>
      <TextInput onChangeText={setDecodedPayload} placeholder="Decoded QR payload" value={decodedPayload} />
      <Button onPress={() => onDecodedPayload(decodedPayload)} title="Submit scan" />
      {state.status === 'submitting' ? <Text>Submitting scan...</Text> : null}
      {state.status === 'result' ? <Text>{state.result.message}</Text> : null}
      {state.status === 'recoverable-error' ? <Text>{state.message}</Text> : null}
      <Button onPress={onReset} title="Reset" />
    </View>
  );
}
