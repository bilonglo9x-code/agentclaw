import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface HeartbeatTarget {
  id: string;
  name: string;
  url: string;
  method: string;
  interval_seconds: number;
  timeout_seconds: number;
  enabled: boolean;
  last_status?: "ok" | "error" | "timeout" | "unknown";
  last_checked_at?: string;
  last_error?: string;
  response_time_ms?: number;
  uptime_pct?: number;
}

export interface HeartbeatConfig {
  enabled: boolean;
  targets: HeartbeatTarget[];
}

export function useHeartbeat() {
  const { ws, connected } = useAuth();
  const [config, setConfig] = useState<HeartbeatConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const [cfgRes, targetsRes] = await Promise.allSettled([
        ws.call<HeartbeatConfig>(Methods.HEARTBEAT_GET),
        ws.call<{ targets: HeartbeatTarget[] }>("heartbeat.targets"),
      ]);
      const cfg = cfgRes.status === "fulfilled" ? cfgRes.value : { enabled: false, targets: [] };
      const targets = targetsRes.status === "fulfilled" ? (targetsRes.value.targets ?? []) : [];
      setConfig({ ...cfg, targets });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load heartbeat");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const toggleTarget = useCallback(
    async (id: string, enabled: boolean) => {
      if (!ws?.isConnected) return;
      await ws.call("heartbeat.toggle", { id, enabled });
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          targets: prev.targets.map((t) => (t.id === id ? { ...t, enabled } : t)),
        };
      });
    },
    [ws],
  );

  const testTarget = useCallback(
    async (id: string): Promise<{ ok: boolean; response_time_ms?: number; error?: string }> => {
      if (!ws?.isConnected) return { ok: false, error: "Not connected" };
      return ws.call("heartbeat.test", { id });
    },
    [ws],
  );

  return { config, loading, error, refresh: load, toggleTarget, testTarget };
}
