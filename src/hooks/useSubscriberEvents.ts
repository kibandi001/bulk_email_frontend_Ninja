// Live-update socket for the Contacts/Subscribers page.

import { useEffect, useRef, useState } from 'react';
import { SUBSCRIBERS_WS_URL } from '../config/constants';
import { getAccessToken } from '../services/apiClient';

const KNOWN_EVENT_TYPES = new Set([
  'subscriber.created',
  'subscriber.updated',
  'subscriber.deleted',
]);

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export interface UploadEvent {
  type:
    | 'subscriber.upload.started'
    | 'subscriber.upload.progress'
    | 'subscriber.upload.completed'
    | 'subscriber.upload.failed';
  upload_id: number;
  total?: number;
  processed?: number;
  created?: number;
  updated?: number;
  failed?: number;
  error?: string;
}

interface UseSubscriberEventsOptions {
  enabled: boolean;
  /** Called on subscriber.created/updated/deleted and after every (re)connect. */
  onChange: () => void;
  /** Called on subscriber.upload.* events. */
  onUploadEvent?: (e: UploadEvent) => void;
}

export function useSubscriberEvents({
  enabled,
  onChange,
  onUploadEvent,
}: UseSubscriberEventsOptions) {
  const [connected, setConnected] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onUploadRef = useRef(onUploadEvent);
  onUploadRef.current = onUploadEvent;

  useEffect(() => {
    if (!enabled || !SUBSCRIBERS_WS_URL) {
      setConnected(false);
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const token = getAccessToken();
      const url = token
        ? `${SUBSCRIBERS_WS_URL}?token=${encodeURIComponent(token)}`
        : SUBSCRIBERS_WS_URL;

      try {
        socket = new WebSocket(url);
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        // Catch anything missed while disconnected.
        onChangeRef.current();
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type?.startsWith('subscriber.upload.')) {
            onUploadRef.current?.(payload as UploadEvent);
          } else if (payload && KNOWN_EVENT_TYPES.has(payload.type)) {
            onChangeRef.current();
          }
        } catch {
          // Not JSON or unrecognised shape: ignore.
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!cancelled) scheduleRetry();
      };

      socket.onerror = () => {};
    }

    function scheduleRetry() {
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}