import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export interface SessionInfo {
  key: string;
  messageCount: number;
  created: string;
  updated: string;
  label?: string;
  model?: string;
  provider?: string;
  channel?: string;
  agentName?: string;
  estimatedTokens?: number;
  contextWindow?: number;
}

export function useSessions(agentId?: string) {
  const { ws, connected } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { channel: "ws" };
      if (agentId) params.agentId = agentId;
      const res = await ws.call<{ sessions: SessionInfo[] }>(Methods.SESSIONS_LIST, params);
      const sorted = (res.sessions ?? []).sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      );
      setSessions(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [ws, agentId]);

  useEffect(() => {
    if (connected) loadSessions();
  }, [connected, loadSessions]);

  useEffect(() => {
    if (!ws) return;
    return ws.on(Events.SESSION_UPDATED, (payload) => {
      const event = payload as { sessionKey?: string; label?: string };
      if (!event?.sessionKey || !event?.label) return;
      setSessions((prev) =>
        prev.map((s) => (s.key === event.sessionKey ? { ...s, label: event.label } : s)),
      );
    });
  }, [ws]);

  const deleteSession = useCallback(
    async (key: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.SESSIONS_DELETE, { key });
      setSessions((prev) => prev.filter((s) => s.key !== key));
    },
    [ws],
  );

  return { sessions, loading, error, refresh: loadSessions, deleteSession };
}

export function useAllSessions() {
  const { ws, http, connected } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!connected || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (ws?.isConnected) {
          const res = await ws.call<{ sessions: SessionInfo[] }>(Methods.SESSIONS_LIST, {
            channel: "ws",
          });
          const sorted = (res.sessions ?? []).sort(
            (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
          );
          setSessions(sorted);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    })();
  }, [connected, ws]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  useEffect(() => {
    if (!ws) return;
    return ws.on(Events.SESSION_UPDATED, () => {
      fetchedRef.current = false;
    });
  }, [ws]);

  return { sessions, loading, error };
}
