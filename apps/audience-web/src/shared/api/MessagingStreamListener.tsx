import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../auth/token-storage';
import { useAuth } from '../auth/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function MessagingStreamListener() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!session || !token) return;

    const socket = io(`${BASE_URL}/resale`, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Connected to Resale Messaging WebSocket');
    });

    socket.on('message.new', (data) => {
      // Invalidate queries to fetch new messages and thread unread counts
      queryClient.invalidateQueries({ queryKey: ['dm-threads'] });
      queryClient.invalidateQueries({ queryKey: ['dm-messages', data.threadId] });
    });

    return () => {
      socket.disconnect();
    };
  }, [session, queryClient]);

  return null;
}
