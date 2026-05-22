import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events } from "@/lib/api/protocol";

export interface TraceData {
  id: string;
  session_key?: string;
  agent_id?: string;
  agent_name?: string;
  user_id?: string;
  channel?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
  error?: string;
  tool_call_count?: number;
  llm_call_count?: number;
}

export function useTraces(limit = 50) {
  const { http, ws, connected } = useAuth();
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ traces: TraceData[]; total?: number }>("/v1/traces", {
        limit: String(limit),
      });
      setTraces(res.traces ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load traces");
    } finally {
      setLoading(false);
    }
  }, [http, connected, limit]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  useEffect(() => {
    if (!ws) return;
    return ws.on(Events.AGENT, () => {
      fetchedRef.current = false;
    });
  }, [ws]);

  return { traces, loading, error, refresh: load };
}
