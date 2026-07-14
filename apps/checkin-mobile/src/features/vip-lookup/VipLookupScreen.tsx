import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import type { StaffAssignment, VipLookupType } from '../../api/checkin-mobile-api.types';
import { ui } from '../../theme/paper-theme';
import { vipLookupPresentation } from './vip-lookup-screen-state';
import { canSubmitVipLookup, type VipLookupInput, type VipLookupState } from './vip-lookup-state';

export interface VipLookupScreenProps {
  readonly assignment: StaffAssignment;
  readonly online: boolean;
  readonly state: VipLookupState;
  readonly onSubmit: (input: VipLookupInput) => void;
  readonly onReset: () => void;
}

export function VipLookupScreen({
  assignment,
  online,
  state,
  onSubmit,
  onReset,
}: VipLookupScreenProps): React.JSX.Element {
  const [lookupType, setLookupType] = useState<VipLookupType>('email');
  const [value, setValue] = useState('');
  const presentation = vipLookupPresentation(state);
  const foundGuest = state.status === 'found' ? state.guest : null;

  return (
    <View style={styles.container}>
      <View>
        <Text variant="headlineSmall" style={styles.title}>
          VIP lookup
        </Text>
        <Text style={styles.assignment}>
          {assignment.concertTitle}
          {assignment.gate ? ` · ${assignment.gate}` : ''}
        </Text>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <SegmentedButtons
            value={lookupType}
            onValueChange={(next: string) => {
              setLookupType(next as VipLookupType);
              onReset();
            }}
            buttons={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'external_ref', label: 'External ref' },
            ]}
          />
          <TextInput
            mode="outlined"
            label={lookupType === 'external_ref' ? 'External reference' : lookupType}
            value={value}
            autoCapitalize="none"
            keyboardType={
              lookupType === 'email'
                ? 'email-address'
                : lookupType === 'phone'
                  ? 'phone-pad'
                  : 'default'
            }
            onChangeText={(next: string) => {
              setValue(next);
              if (state.status !== 'idle') onReset();
            }}
          />
          {!online ? (
            <HelperText type="info" visible>
              You are offline. Connect to the internet to verify a VIP.
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            icon="account-search"
            loading={state.status === 'submitting'}
            disabled={!canSubmitVipLookup(online, state, value)}
            onPress={() => onSubmit({ lookupType, value })}
          >
            Verify VIP
          </Button>
        </Card.Content>
      </Card>

      {presentation.visible ? (
        <Card style={[styles.result, styles[`${presentation.tone}Result`]]} mode="outlined">
          <Card.Content style={styles.resultContent}>
            <Text variant="titleMedium" style={styles.resultTitle}>
              {presentation.title}
            </Text>
            <Text>{presentation.message}</Text>
            {foundGuest ? (
              <View style={styles.identifiers}>
                {foundGuest.email ? <Text>Email: {foundGuest.email}</Text> : null}
                {foundGuest.phone ? <Text>Phone: {foundGuest.phone}</Text> : null}
                {foundGuest.externalRef ? (
                  <Text>External ref: {foundGuest.externalRef}</Text>
                ) : null}
              </View>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { color: ui.textPrimary, fontWeight: '800' },
  assignment: { color: ui.textMuted, marginTop: 4 },
  card: { backgroundColor: ui.card, borderRadius: 14 },
  cardContent: { gap: 14 },
  result: { borderRadius: 14 },
  successResult: { borderColor: ui.success, backgroundColor: '#f0fdf4' },
  neutralResult: { borderColor: ui.textMuted, backgroundColor: ui.inputBg },
  warningResult: { borderColor: ui.warning, backgroundColor: '#fffbeb' },
  errorResult: { borderColor: ui.danger, backgroundColor: '#fef2f2' },
  resultContent: { gap: 4 },
  resultTitle: { color: ui.textPrimary, fontWeight: '700' },
  identifiers: { gap: 2, marginTop: 8 },
});
