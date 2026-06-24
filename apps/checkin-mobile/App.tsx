import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Appbar, Icon, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { paperTheme, ui } from './src/theme/paper-theme';
import { BottomTabBar, type AppTab } from './src/features/navigation/BottomTabBar';
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
import { SqliteOfflineScanQueue } from './src/features/offline-queue/sqlite-offline-scan-queue';
import type { OfflineScanEvent } from './src/features/offline-queue/offline-scan-queue.port';
import { NetInfoNetworkMonitor } from './src/features/offline-queue/netinfo-network-monitor';
import { hashQrPayload } from './src/features/offline-queue/qr-hasher';
import { SyncService, type SyncServiceState } from './src/features/offline-queue/sync-service';
import { SyncStatusPanel } from './src/features/offline-queue/SyncStatusPanel';
import { shouldShowSyncControls } from './src/features/offline-queue/sync-panel-state';
import { expoLocalIdProvider } from './src/features/offline-queue/local-id-provider';
import { OfflineQueueBootstrap } from './src/features/offline-queue/offline-queue-bootstrap';
import { TicketCacheRepository } from './src/features/ticket-cache/ticket-cache.repository';
import { CacheDownloadService, type CacheDownloadStatus } from './src/features/ticket-cache/cache-download.service';

const env = getMobileEnv();

export default function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<AuthState>({ status: 'restoring' });
  const [assignmentState, setAssignmentState] = useState<AssignmentState>({ status: 'idle' });
  const [scanState, setScanState] = useState<ScanWorkflowState>({ status: 'initializing' });
  const [route, setRoute] = useState<'auth' | 'assignments' | 'scanner'>('auth');
  const [tab, setTab] = useState<AppTab>('scan');
  const [scanWorkflow, setScanWorkflow] = useState<ScanWorkflow | null>(null);
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<SqliteOfflineScanQueue | null>(null);
  const [offlineBootstrapError, setOfflineBootstrapError] = useState<string | null>(null);
  const [offlineBootstrapAttempt, setOfflineBootstrapAttempt] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedEvents, setFailedEvents] = useState<OfflineScanEvent[]>([]);
  const [syncState, setSyncState] = useState<SyncServiceState>({
    status: 'idle',
    counts: { accepted: 0, duplicate: 0, invalid: 0, conflict: 0, unassigned: 0 },
  });
  const [cacheStatus, setCacheStatus] = useState<CacheDownloadStatus>('idle');
  const [online, setOnline] = useState(true);
  const ticketCacheRepoRef = useRef<TicketCacheRepository | null>(null);
  const cacheDownloadServiceRef = useRef<CacheDownloadService | null>(null);
  const authStateRef = useRef(authState);
  const apiClient = useMemo(() => new HttpCheckinMobileApiClient({ baseUrl: env.apiBaseUrl }), []);
  const sessionStore = useMemo(() => new ExpoSecureSessionStore(), []);
  const authController = useMemo(
    () => new AuthSessionController(apiClient, sessionStore),
    [apiClient, sessionStore],
  );
  const assignmentController = useMemo(() => new AssignmentController(apiClient), [apiClient]);
  const offlineBootstrap = useMemo(() => new OfflineQueueBootstrap(), []);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    let active = true;
    let workflow: ScanWorkflow | null = null;
    let service: SyncService | null = null;
    let unsubscribeSync: (() => void) | null = null;
    let unsubscribeNetwork: (() => void) | null = null;
    setOfflineBootstrapError(null);
    setOfflineQueue(null);
    setScanWorkflow(null);
    setSyncService(null);
    setScanState({ status: 'initializing' });
    void offlineBootstrap.initialize().then(async (bootstrapState) => {
      if (!active) return;
      if (bootstrapState.status === 'recoverable-error') {
        setOfflineBootstrapError(bootstrapState.message);
        setScanState({ status: 'recoverable-error', message: bootstrapState.message });
        return;
      }
      if (bootstrapState.status !== 'ready') return;
      const queue = bootstrapState.queue;
      const cacheRepo = new TicketCacheRepository(bootstrapState.database);
      ticketCacheRepoRef.current = cacheRepo;
      const cacheService = new CacheDownloadService(apiClient, cacheRepo);
      cacheDownloadServiceRef.current = cacheService;
      const network = new NetInfoNetworkMonitor();
      setOnline(network.isOnline());
      unsubscribeNetwork = network.onStatusChange(setOnline);
      workflow = new ScanWorkflow(
        apiClient,
        getOrCreateInstallationId,
        () => new Date(),
        queue,
        network,
        hashQrPayload,
        expoLocalIdProvider,
        cacheRepo,
      );
      service = new SyncService(queue, apiClient, network, () => {
        const current = authStateRef.current;
        return current.status === 'authenticated' ? current.session : null;
      }, Math.random, () => new Date(), cacheRepo);
      unsubscribeSync = service.subscribe((state) => {
        setSyncState(state);
        void refreshQueue(queue, authStateRef.current);
      });
      setOfflineQueue(queue);
      setScanWorkflow(workflow);
      setSyncService(service);
      setScanState(await workflow.initialize());
    });
    return () => {
      active = false;
      unsubscribeSync?.();
      unsubscribeNetwork?.();
      service?.dispose();
      workflow?.dispose();
    };
  }, [apiClient, offlineBootstrap, offlineBootstrapAttempt]);

  useEffect(() => {
    if (authState.status === 'authenticated') {
      void syncService?.trigger(authState.session);
      if (offlineQueue) void refreshQueue(offlineQueue, authState);

      const intervalId = setInterval(() => {
        void syncService?.trigger(authState.session);
      }, 30_000);

      return () => clearInterval(intervalId);
    }
  }, [authState, offlineQueue, syncService]);

  useEffect(() => {
    let active = true;
    setAuthState({ status: 'restoring' });

    void restoreStartupSession(authController, assignmentController).then((restored) => {
      if (!active) return;
      setAuthState(restored.auth);
      setAssignmentState(restored.assignments);
      const nextRoute = restored.auth.status !== 'authenticated'
        ? 'auth'
        : restored.assignments.status === 'loaded'
          ? 'scanner'
          : 'assignments';
      setRoute(nextRoute);

      if (nextRoute === 'scanner' && restored.assignments.status === 'loaded') {
        void triggerCacheDownload(restored.assignments.selected, restored.auth);
      }
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
    if (nextAssignments.status === 'loaded') {
      setRoute('scanner');
      void triggerCacheDownload(nextAssignments.selected, auth);
    } else {
      setRoute('assignments');
    }
  }

  async function triggerCacheDownload(
    assignment: { assignmentId: string; concertId: string; gate?: string; concertTitle: string; startsAt: string; status: 'ACTIVE' },
    auth: AuthState,
  ): Promise<void> {
    if (auth.status !== 'authenticated' || !cacheDownloadServiceRef.current) return;
    setCacheStatus('downloading');
    await cacheDownloadServiceRef.current.download(assignment, auth.session);
    setCacheStatus(cacheDownloadServiceRef.current.status);
  }

  async function refreshQueue(queue: SqliteOfflineScanQueue, auth: AuthState): Promise<void> {
    if (auth.status !== 'authenticated') return;
    const [count, failed] = await Promise.all([
      queue.getPendingCount(auth.session.profile.id),
      queue.getFailedScanEvents(auth.session.profile.id),
    ]);
    setPendingCount(count);
    setFailedEvents(failed);
  }

  if (route === 'auth') {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <LoginScreen
            onSubmit={(email, password) => {
              void authController.login({ email, password }).then((nextAuth) => {
                setAuthState(nextAuth);
                void loadAssignments(nextAuth);
              });
            }}
            state={authState}
          />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  const handleLogout = (): void => {
    void authController.logout().then(async (nextAuth) => {
      if (authState.status === 'authenticated' && ticketCacheRepoRef.current) {
        await ticketCacheRepoRef.current.clearForStaff(authState.session.profile.id);
      }
      setAuthState(nextAuth);
      setAssignmentState({ status: 'idle' });
      setCacheStatus('idle');
      setTab('scan');
      if (scanWorkflow) setScanState(scanWorkflow.reset());
      setRoute('auth');
    });
  };

  const syncPanel =
    authState.status === 'authenticated' && offlineQueue ? (
      <SyncStatusPanel
        failedEvents={failedEvents}
        online={online}
        onClearSynced={() => {
          void offlineQueue
            .clearSynced(authState.session.profile.id)
            .then(() => refreshQueue(offlineQueue, authState));
        }}
        onClearTerminalResults={() => {
          void offlineQueue
            .clearTerminalResults(authState.session.profile.id)
            .then(() => refreshQueue(offlineQueue, authState));
        }}
        onSync={() => void syncService?.trigger(authState.session)}
        pendingCount={pendingCount}
        showControls={shouldShowSyncControls({
          online,
          pendingCount,
          failedCount: failedEvents.length,
        })}
        state={syncState}
      />
    ) : null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <SafeAreaView style={styles.root}>
          <Appbar.Header style={styles.appbar} statusBarHeight={0}>
            <View style={styles.brand}>
              <Icon source="ticket-confirmation" size={22} color={ui.primary} />
              <Text style={styles.brandText}>TicketBox</Text>
            </View>
            <Appbar.Action icon="logout" onPress={handleLogout} accessibilityLabel="Logout" />
          </Appbar.Header>

          <ScrollView contentContainerStyle={styles.content}>
            {offlineBootstrapError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.warn}>{offlineBootstrapError}</Text>
                <Button
                  onPress={() => setOfflineBootstrapAttempt((attempt) => attempt + 1)}
                  title="Retry offline storage"
                />
              </View>
            ) : null}

            {route === 'assignments' ? (
              <AssignmentScreen
                onOpenScanner={() => setRoute('scanner')}
                onRetry={() => {
                  void loadAssignments(authState);
                }}
                onSelect={(assignmentId) => {
                  const next = assignmentController.select(assignmentState, assignmentId);
                  setAssignmentState(next);
                  if (next.status === 'loaded') {
                    void triggerCacheDownload(next.selected, authState);
                  }
                }}
                state={assignmentState}
              />
            ) : null}

            {route === 'scanner' && tab === 'scan' ? (
              <View style={styles.tabContent}>
                {cacheStatus === 'unavailable' ? (
                  <Text style={styles.warn}>⚠ Offline cache unavailable — scans will be queued</Text>
                ) : null}
                {assignmentState.status === 'loaded' ? (
                  <ScannerScreen
                    assignment={assignmentState.selected}
                    onDecodedPayload={(payload) => {
                      if (authState.status !== 'authenticated') {
                        return;
                      }
                      void scanWorkflow
                        ?.submitDecodedPayload(payload, assignmentState.selected, authState.session)
                        .then((state) => {
                          setScanState(state);
                          if (offlineQueue) void refreshQueue(offlineQueue, authState);
                        })
                        .catch((error: unknown) => {
                          // Final safety net so the UI never stays stuck on "Submitting scan…".
                          setScanState({
                            status: 'recoverable-error',
                            message:
                              error instanceof Error ? error.message : 'Scan submission failed',
                          });
                        });
                      if (scanWorkflow) setScanState(scanWorkflow.state);
                    }}
                    onReset={() => scanWorkflow && setScanState(scanWorkflow.reset())}
                    onRetryInitialization={() => {
                      setScanState({ status: 'initializing' });
                      void scanWorkflow?.initialize().then(setScanState);
                    }}
                    state={scanState}
                  />
                ) : null}
                {syncPanel}
              </View>
            ) : null}

            {route === 'scanner' && tab === 'sync' ? (
              <View style={styles.tabContent}>{syncPanel}</View>
            ) : null}
          </ScrollView>

          {route === 'scanner' ? (
            <BottomTabBar tab={tab} syncBadge={pendingCount > 0} onChange={setTab} />
          ) : null}
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ui.bg,
  },
  appbar: {
    backgroundColor: ui.card,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  tabContent: {
    gap: 16,
  },
  errorBlock: {
    gap: 8,
  },
  warn: {
    color: ui.danger,
    fontSize: 14,
  },
});
