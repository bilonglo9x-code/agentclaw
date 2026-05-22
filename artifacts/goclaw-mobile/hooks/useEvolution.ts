import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface EvolutionSuggestion {
  id: string;
  agent_id: string;
  type: string;
  status: "pending" | "approved" | "rejected" | "applied" | "rolled_back";
  title?: string;
  content?: string;
  rationale?: string;
  skill_draft?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface ToolAggregate {
  tool_name: string;
  call_count: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
}

export interface RetrievalAggregate {
  query_count: number;
  avg_relevance: number;
  avg_latency_ms: number;
}

export function useEvolution(agentId?: string) {
  const { http, connected } = useAuth();
  const [suggestions, setSuggestions] = useState<EvolutionSuggestion[]>([]);
  const [toolAggs, setToolAggs] = useState<ToolAggregate[]>([]);
  const [retrievalAggs, setRetrievalAggs] = useState<RetrievalAggregate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!http || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const [sugsRes, metricsRes] = await Promise.allSettled([
        http.get<EvolutionSuggestion[]>(
          `/v1/agents/${agentId}/evolution/suggestions?status=${statusFilter}&limit=100`,
        ),
        http.get<{ tool_aggregates: ToolAggregate[]; retrieval_aggregates: RetrievalAggregate[] }>(
          `/v1/agents/${agentId}/evolution/metrics?aggregate=true`,
        ),
      ]);
      if (sugsRes.status === "fulfilled") {
        setSuggestions(Array.isArray(sugsRes.value) ? sugsRes.value : []);
      }
      if (metricsRes.status === "fulfilled") {
        setToolAggs(metricsRes.value.tool_aggregates ?? []);
        setRetrievalAggs(metricsRes.value.retrieval_aggregates ?? []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load evolution data");
    } finally {
      setLoading(false);
    }
  }, [http, agentId, statusFilter]);

  const updateSuggestion = useCallback(
    async (suggestionId: string, status: "approved" | "rejected" | "rolled_back"): Promise<boolean> => {
      if (!http || !agentId) return false;
      setUpdating(suggestionId);
      try {
        await http.patch(`/v1/agents/${agentId}/evolution/suggestions/${suggestionId}`, { status });
        setSuggestions((prev) =>
          prev.map((s) => s.id === suggestionId ? { ...s, status } : s),
        );
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update suggestion");
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [http, agentId],
  );

  useEffect(() => {
    if (connected && agentId) fetch();
  }, [connected, agentId, fetch]);

  return { suggestions, toolAggs, retrievalAggs, statusFilter, setStatusFilter, loading, updating, error, refresh: fetch, updateSuggestion };
}
