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

interface UseSubscriberEventsOptions {
  /** Turn the socket off (e.g. while a modal is open, or off the Contacts tab). */
  enabled: boolean;
  /** Called whenever a recognised change event arrives — trigger a silent refetch here. */
  onChange: () => void;
}

export function useSubscriberEvents({ enabled, onChange }: UseSubscriberEventsOptions) {
  const [connected, setConnected] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && KNOWN_EVENT_TYPES.has(payload.type)) {
            onChangeRef.current();
          }
        } catch {
          // Not JSON, or not a shape we recognise — ignore rather than crash.
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (!cancelled) scheduleRetry();
      };

      // Errors are followed by a close event on every browser we support, so
      // the retry itself is scheduled from onclose — this just avoids an
      // unhandled-error console spam on the WebSocket object.
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
