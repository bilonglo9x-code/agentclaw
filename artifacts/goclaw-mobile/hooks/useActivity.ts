import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ActivityLog {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: unknown;
  ip_address: string;
  created_at: string;
}

export function useActivity(limit = 50) {
  const { http, connected } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(
    async (opts?: { action?: string; entityType?: string; offset?: number }) => {
      if (!http || !connected) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = { limit: String(limit) };
        if (opts?.action) params.action = opts.action;
        if (opts?.entityType) params.entity_type = opts.entityType;
        if (opts?.offset) params.offset = String(opts.offset);
        const res = await http.get<{ logs: ActivityLog[]; total: number }>("/v1/activity", params);
        setLogs(res.logs ?? []);
        setTotal(res.total ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    },
    [http, connected, limit],
  );

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { logs, total, loading, error, refresh: () => load() };
}
