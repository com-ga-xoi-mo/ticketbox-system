import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Checkbox,
  HelperText,
  Icon,
  Text,
  TextInput,
  TouchableRipple,
} from 'react-native-paper';

import { ui } from '../../theme/paper-theme';
import type { AuthState } from './auth-state';

export interface LoginScreenProps {
  readonly state: AuthState;
  readonly onSubmit: (email: string, password: string) => void;
}

export function LoginScreen({ state, onSubmit }: LoginScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const errorText =
    state.status === 'error'
      ? state.message
      : state.status === 'blocked'
        ? 'Check-in staff access is required.'
        : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.badge}>
        <Icon source="ticket-confirmation" size={30} color="#ffffff" />
      </View>
      <Text style={styles.appName}>TicketBox</Text>
      <Text style={styles.tagline}>Sign in to manage your events.</Text>

      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            mode="outlined"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            left={<TextInput.Icon icon="email-outline" />}
            outlineStyle={styles.inputOutline}
            style={styles.input}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>PASSWORD</Text>
            <TouchableRipple onPress={() => undefined} borderless>
              <Text style={styles.link}>Forgot?</Text>
            </TouchableRipple>
          </View>
          <TextInput
            mode="outlined"
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((shown) => !shown)}
              />
            }
            outlineStyle={styles.inputOutline}
            style={styles.input}
          />

          <TouchableRipple onPress={() => setRemember((on) => !on)} style={styles.remember}>
            <View style={styles.rememberRow}>
              <Checkbox status={remember ? 'checked' : 'unchecked'} />
              <Text style={styles.rememberText}>Remember me</Text>
            </View>
          </TouchableRipple>

          {errorText ? (
            <HelperText type="error" visible>
              {errorText}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={() => onSubmit(email, password)}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableRipple onPress={() => undefined} borderless>
              <Text style={styles.link}>Sign up</Text>
            </TouchableRipple>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: ui.bg,
    justifyContent: 'center',
    padding: 24,
  },
  badge: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: ui.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  tagline: {
    textAlign: 'center',
    fontSize: 14,
    color: ui.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    backgroundColor: ui.card,
  },
  content: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: ui.label,
    marginTop: 12,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.primary,
  },
  input: {
    backgroundColor: ui.card,
  },
  inputOutline: {
    borderRadius: 10,
  },
  remember: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    color: ui.textMuted,
  },
  button: {
    marginTop: 16,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: ui.textMuted,
  },
});
