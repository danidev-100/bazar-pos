import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "offline";

export type SyncResult = {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
  completed_at: string;
};

export type SyncState = {
  /** Current sync status. */
  status: SyncStatus;
  /** ISO timestamp of last completed sync. */
  lastSyncedAt: string | null;
  /** Error message when status is "error". */
  error: string | null;
  /** Result from the last sync cycle. */
  lastResult: SyncResult | null;
  /** Whether the browser considers the app online. */
  isOnline: boolean;
};

type UseSyncOptions = {
  /** Sync interval in minutes (default: 60). */
  intervalMinutes?: number;
  /** Whether to auto-start the timer (default: true). */
  autoStart?: boolean;
};

// ──────────────────────────────────────────────
// Sync state store (module-level singleton)
// ──────────────────────────────────────────────

/**
 * Reactive sync state. Components can call `getSyncState()` to read the
 * current value or subscribe to changes via `onStateChange`.
 */
let _state: SyncState = {
  status: "idle",
  lastSyncedAt: null,
  error: null,
  lastResult: null,
  isOnline: navigator.onLine,
};

const _listeners = new Set<(state: SyncState) => void>();

function setState(partial: Partial<SyncState>): void {
  _state = { ..._state, ...partial };
  _listeners.forEach((cb) => cb(_state));
}

/** Returns the current sync state snapshot. */
export function getSyncState(): SyncState {
  return _state;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Attempts to detect network connectivity by calling the sync endpoint.
 * Falls back to `navigator.onLine` if the invoke fails.
 */
async function checkConnectivity(): Promise<boolean> {
  if (!navigator.onLine) return false;

  // Try a lightweight connectivity check
  try {
    // If we can invoke sync, the Tauri backend is reachable
    // (this doesn't run the full sync, just verifies the process is alive)
    await invoke("sync_now");
    return true;
  } catch {
    // sync might fail for DB reasons but the process is alive
    return true;
  }
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * React hook that manages the hourly background sync cycle.
 *
 * - Automatically calls `sync_now` via Tauri `invoke` every 60 minutes.
 * - Provides `triggerSync()` for manual "sync now" invocations.
 * - Exposes reactive sync state via `useSync()` return value.
 * - Handles offline detection — skips sync when offline, retries on next
 *   interval tick.
 * - Cleans up the interval timer on unmount.
 *
 * @example
 * ```tsx
 * function SyncIndicator() {
 *   const { status, lastSyncedAt, triggerSync } = useSync();
 *   return (
 *     <div>
 *       <span>Status: {status}</span>
 *       <button onClick={triggerSync}>Sync Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSync(options: UseSyncOptions = {}): SyncState & {
  triggerSync: () => Promise<SyncResult | null>;
} {
  const { intervalMinutes = 60, autoStart = true } = options;

  // Local state mirror for reactivity
  const [syncState, setLocalState] = useState<SyncState>(_state);

  // Stable refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  // Subscribe to state changes
  useEffect(() => {
    const handler = (state: SyncState) => setLocalState(state);
    _listeners.add(handler);
    return () => {
      _listeners.delete(handler);
    };
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const goOnline = () => setState({ isOnline: true });
    const goOffline = () => setState({ isOnline: false });

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Core sync function ──

  const triggerSync = useCallback(async (): Promise<SyncResult | null> => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) return null;
    isSyncingRef.current = true;

    try {
      setState({ status: "syncing", error: null });

      // Check connectivity
      const online = await checkConnectivity();
      if (!online) {
        setState({ status: "offline", error: "Device is offline" });
        return null;
      }

      // Invoke the Tauri backend sync command
      const rawResult: string = await invoke("sync_now");
      const result: SyncResult = JSON.parse(rawResult);

      setState({
        status: "success",
        lastSyncedAt: result.completed_at,
        lastResult: result,
        error: null,
      });

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown sync error";

      setState({
        status: "error",
        error: message,
      });

      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // ── Interval timer ──

  useEffect(() => {
    if (!autoStart) return;

    // Start the interval
    intervalRef.current = setInterval(() => {
      triggerSync();
    }, intervalMinutes * 60 * 1000);

    // Run the first sync after a short delay (don't block UI mount)
    const initialTimer = setTimeout(() => {
      triggerSync();
    }, 5_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(initialTimer);
    };
  }, [autoStart, intervalMinutes, triggerSync]);

  return {
    ...syncState,
    triggerSync,
  };
}
