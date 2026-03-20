import { useEffect, useRef, useCallback } from "react";

const QUEUE_KEY = "pool_offline_queue";

function loadQueue()      { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); } catch { return []; } }
function saveQueue(q)     { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
function clearQueue()     { localStorage.removeItem(QUEUE_KEY); }

// ── useOfflineQueue ───────────────────────────────────────────────────────────
// When offline, actions are queued to localStorage.
// When connectivity returns, queued actions are flushed in order.

export function useOfflineQueue({ online, pushEntry, pushGPS, pushSubmission }) {
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const queue = loadQueue();
    if (!queue.length) return;
    flushing.current = true;
    const failed = [];
    for (const item of queue) {
      try {
        if (item.type === "entry")      await pushEntry(item.tech, item.wk, item.day, item.entry);
        if (item.type === "gps")        await pushGPS(item.tech, item.point);
        if (item.type === "submission") await pushSubmission(item.tech, item.wk, item.ts);
      } catch {
        failed.push(item); // keep failed items for retry
      }
    }
    saveQueue(failed);
    flushing.current = false;
  }, [pushEntry, pushGPS, pushSubmission]);

  // Flush when coming back online
  useEffect(() => { if (online) flush(); }, [online, flush]);

  const enqueue = useCallback((item) => {
    const q = loadQueue();
    q.push({ ...item, queuedAt: new Date().toISOString() });
    saveQueue(q);
  }, []);

  const queueLength = loadQueue().length;

  return { enqueue, queueLength, flush };
}
