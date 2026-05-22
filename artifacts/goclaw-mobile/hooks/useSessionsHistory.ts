import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface SessionInfo {
  key: string;
  messageCount: number;
  created: string;
  updated: string;
  label?: string;
  model?: string;
  provider?: string;
  channel?: string;
  inputTokens?: number;
  outputTokens?: number;
  userID?: string;
  agentName?: string;
  estimatedTokens?: number;
  contextWindow?: number;
  compactionCount?: number;
}

export function useSessionsHistory(agentFilter?: string, limit = 50) {
  const { ws, connected } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("_none_");

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ sessions: SessionInfo[]; total?: number }>(Methods.SESSIONS_LIST, {
        agentId: agentFilter || undefined,
        limit,
      });
      setSessions(res.sessions ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [ws, agentFilter, limit]);

  const cacheKey = agentFilter ?? "_all_";
  useEffect(() => {
    if (connected && fetchedRef.current !== cacheKey) {
      fetchedRef.current = cacheKey;
      load();
    }
  }, [connected, cacheKey, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = "_none_";
  }, [connected]);

  const deleteSession = useCallback(
    async (key: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.SESSIONS_DELETE, { key });
      setSessions((prev) => prev.filter((s) => s.key !== key));
      setTotal((t) => t - 1);
    },
    [ws],
  );

  const resetSession = useCallback(
    async (key: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.SESSIONS_RESET, { key });
      await load();
    },
    [ws, load],
  );

  const labelSession = useCallback(
    async (key: string, label: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.SESSIONS_PATCH, { key, label: label.trim() || null });
      setSessions((prev) =>
        prev.map((s) => (s.key === key ? { ...s, label: label.trim() || undefined } : s)),
      );
    },
    [ws],
  );

  return { sessions, total, loading, error, refresh: load, deleteSession, resetSession, labelSession };
}
