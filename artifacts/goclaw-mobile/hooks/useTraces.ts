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
      const res = await http.get<{ traces: Array<any>; total?: number }>("/v1/traces", {
        limit: String(limit),
      });
      const mapped: TraceData[] = (res.traces ?? []).map((t) => {
        // Extract agent key from session_key like "agent:nina:ws:..."
        const sessionParts = (t.session_key ?? "").split(":");
        const agentKeyFromSession = sessionParts.length >= 2 ? sessionParts[1] : undefined;
        return {
          id: t.id,
          session_key: t.session_key,
          agent_id: t.agent_id,
          agent_name: t.agent_name ?? agentKeyFromSession ?? t.name,
          user_id: t.user_id,
          channel: t.channel,
          status: t.status ?? "completed",
          started_at: t.start_time ?? t.started_at ?? t.created_at,
          finished_at: t.end_time ?? t.finished_at,
          duration_ms: t.duration_ms ?? (t.start_time && t.end_time ? new Date(t.end_time).getTime() - new Date(t.start_time).getTime() : undefined),
          input_tokens: t.input_tokens ?? t.total_input_tokens,
          output_tokens: t.output_tokens ?? t.total_output_tokens,
          total_cost: t.total_cost,
          error: t.error,
          tool_call_count: t.tool_call_count,
          llm_call_count: t.llm_call_count,
        };
      });
      setTraces(mapped);
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
