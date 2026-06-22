import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

import type { AuthState } from './auth-state';

export interface LoginScreenProps {
  readonly state: AuthState;
  readonly onSubmit: (email: string, password: string) => void;
}

export function LoginScreen({ state, onSubmit }: LoginScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View>
      <Text>Staff login</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      <Button onPress={() => onSubmit(email, password)} title="Log in" />
      {state.status === 'error' ? <Text>{state.message}</Text> : null}
      {state.status === 'blocked' ? <Text>Check-in staff access is required.</Text> : null}
    </View>
  );
}
