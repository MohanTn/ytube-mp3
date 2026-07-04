import { useEffect, useRef, useState } from 'react';

const EVENT_TYPES = ['snapshot', 'queue:update', 'item:progress', 'settings:update', 'system:error', 'system:status'];

/**
 * Subscribes to /api/events (SSE) and invokes `onEvent(type, data)` for
 * each typed event. Returns the current connection status
 * ('connecting' | 'open' | 'closed').
 */
export function useEventSource(onEvent) {
  const [status, setStatus] = useState('connecting');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const source = new EventSource('/api/events');

    setStatus('connecting');
    source.onopen = () => setStatus('open');
    source.onerror = () => setStatus('closed');

    const listeners = EVENT_TYPES.map((type) => {
      const handler = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        onEventRef.current(type, data);
      };
      source.addEventListener(type, handler);
      return { type, handler };
    });

    return () => {
      listeners.forEach(({ type, handler }) => source.removeEventListener(type, handler));
      source.close();
    };
  }, []);

  return status;
}
