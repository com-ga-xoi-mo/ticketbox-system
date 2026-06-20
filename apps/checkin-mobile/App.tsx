import React, { useEffect, useMemo, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { getMobileEnv } from './src/config/mobile-env';
import { HttpCheckinMobileApiClient } from './src/api/http-checkin-mobile-api-client';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { AssignmentScreen } from './src/features/assignments/AssignmentScreen';
import { ScannerScreen } from './src/features/scanner/ScannerScreen';
import type { AuthState } from './src/features/auth/auth-state';
import { AuthSessionController } from './src/features/auth/auth-state';
import type { AssignmentState } from './src/features/assignments/assignment-state';
import { AssignmentController } from './src/features/assignments/assignment-state';
import type { ScanWorkflowState } from './src/features/scanner/scan-workflow';
import { ScanWorkflow } from './src/features/scanner/scan-workflow';
import { ExpoSecureSessionStore } from './src/storage/session-store';
import { getOrCreateInstallationId } from './src/storage/installation-id';
import { restoreStartupSession } from './src/app/restore-startup-session';

const env = getMobileEnv();

export default function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<AuthState>({ status: 'restoring' });
  const [assignmentState, setAssignmentState] = useState<AssignmentState>({ status: 'idle' });
  const [scanState, setScanState] = useState<ScanWorkflowState>({ status: 'initializing' });
  const [route, setRoute] = useState<'auth' | 'assignments' | 'scanner'>('auth');
  const apiClient = useMemo(() => new HttpCheckinMobileApiClient({ baseUrl: env.apiBaseUrl }), []);
  const sessionStore = useMemo(() => new ExpoSecureSessionStore(), []);
  const authController = useMemo(
    () => new AuthSessionController(apiClient, sessionStore),
    [apiClient, sessionStore],
  );
  const assignmentController = useMemo(() => new AssignmentController(apiClient), [apiClient]);
  const scanWorkflow = useMemo(
    () => new ScanWorkflow(apiClient, getOrCreateInstallationId),
    [apiClient],
  );

  useEffect(() => {
    void scanWorkflow.initialize().then(setScanState);
  }, [scanWorkflow]);

  useEffect(() => {
    let active = true;
    setAuthState({ status: 'restoring' });

    void restoreStartupSession(authController, assignmentController).then((restored) => {
      if (!active) return;
      setAuthState(restored.auth);
      setAssignmentState(restored.assignments);
      setRoute(restored.auth.status === 'authenticated' ? 'assignments' : 'auth');
    });

    return () => {
      active = false;
    };
  }, [assignmentController, authController]);

  async function loadAssignments(auth: AuthState): Promise<void> {
    if (auth.status !== 'authenticated') {
      return;
    }

    setAssignmentState({ status: 'loading' });
    const nextAssignments = await assignmentController.load(auth.session);
    setAssignmentState(nextAssignments);
    setRoute(nextAssignments.status === 'loaded' ? 'assignments' : 'assignments');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>TicketBox</Text>
        <Text style={styles.title}>Check-in Staff</Text>
        <Text style={styles.body}>API: {env.apiBaseUrl}</Text>
        {route === 'auth' ? (
          <LoginScreen
            onSubmit={(email, password) => {
              void authController.login({ email, password }).then((nextAuth) => {
                setAuthState(nextAuth);
                void loadAssignments(nextAuth);
              });
            }}
            state={authState}
          />
        ) : null}
        {route === 'assignments' ? (
          <AssignmentScreen
            onOpenScanner={() => setRoute('scanner')}
            onRetry={() => {
              void loadAssignments(authState);
            }}
            onSelect={(assignmentId) => {
              setAssignmentState(assignmentController.select(assignmentState, assignmentId));
            }}
            state={assignmentState}
          />
        ) : null}
        {route === 'scanner' && assignmentState.status === 'loaded' ? (
          <ScannerScreen
            assignment={assignmentState.selected}
            onDecodedPayload={(payload) => {
              if (authState.status !== 'authenticated') {
                return;
              }

              void scanWorkflow
                .submitDecodedPayload(payload, assignmentState.selected, authState.session)
                .then(setScanState);
              setScanState(scanWorkflow.state);
            }}
            onReset={() => setScanState(scanWorkflow.reset())}
            onRetryInitialization={() => {
              setScanState({ status: 'initializing' });
              void scanWorkflow.initialize().then(setScanState);
            }}
            state={scanState}
          />
        ) : null}
        {route !== 'auth' ? (
          <Button
            onPress={() => {
              void authController.logout().then((nextAuth) => {
                setAuthState(nextAuth);
                setAssignmentState({ status: 'idle' });
                setScanState(scanWorkflow.reset());
                setRoute('auth');
              });
            }}
            title="Log out"
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#101418',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    gap: 12,
  },
  eyebrow: {
    color: '#6ee7b7',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
  },
  body: {
    color: '#cbd5e1',
    fontSize: 16,
  },
});
