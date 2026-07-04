import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../api/client.js';
import { useEventSource } from '../api/useEventSource.js';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const connectionStatus = useEventSource(
    useCallback((type, data) => {
      switch (type) {
        case 'snapshot':
          setQueue(data.queue);
          setSettings(data.settings);
          setSystemStatus(data.systemStatus);
          break;
        case 'queue:update':
          setQueue(data.queue);
          break;
        case 'item:progress':
          setQueue((prev) =>
            prev.map((item) =>
              item.id === data.id
                ? { ...item, status: data.status, progress: data.progress, speed: data.speed, eta: data.eta }
                : item
            )
          );
          break;
        case 'settings:update':
          setSettings(data);
          break;
        case 'system:status':
          setSystemStatus(data);
          break;
        case 'system:error':
          addToast(data.message, 'error');
          break;
        default:
          break;
      }
    }, [addToast])
  );

  useEffect(() => {
    api.getQueue().then((res) => {
      setQueue(res.queue);
      setSystemStatus(res.systemStatus);
    });
    api.getSettings().then(setSettings);
  }, []);

  const addUrls = useCallback(
    async (urls) => {
      const res = await api.addUrls(urls);
      setQueue((prev) => [...prev, ...res.added]);
      if (res.rejected.length > 0) {
        res.rejected.forEach((r) => addToast(`Skipped "${r.url}": ${r.reason}`, 'error'));
      }
      if (res.added.length > 0) {
        addToast(`Added ${res.added.length} item(s) to the queue`, 'success');
      }
      return res;
    },
    [addToast]
  );

  const removeItem = useCallback(
    async (id) => {
      await api.removeQueueItem(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    },
    []
  );

  const retryItem = useCallback(async (id) => {
    const item = await api.retryQueueItem(id);
    setQueue((prev) => prev.map((q) => (q.id === id ? item : q)));
  }, []);

  const updateSettings = useCallback(
    async (partial) => {
      const updated = await api.updateSettings(partial);
      setSettings(updated);
      addToast('Settings saved', 'success');
      return updated;
    },
    [addToast]
  );

  const value = {
    queue,
    settings,
    systemStatus,
    connectionStatus,
    toasts,
    addUrls,
    removeItem,
    retryItem,
    updateSettings,
    addToast
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
