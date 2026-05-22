import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface MemoryDocument {
  path: string;
  hash: string;
  agent_id?: string;
  user_id?: string;
  updated_at: number;
}

export interface EpisodicSummary {
  id: string;
  agent_id: string;
  user_id: string;
  session_key: string;
  summary: string;
  key_topics: string[];
  l0_abstract: string;
  source_type: "session" | "v2_daily" | "manual";
  turn_count: number;
  token_count: number;
  created_at: string;
  expires_at: string | null;
}

export function useMemory(agentId?: string) {
  const { http, connected } = useAuth();
  const [documents, setDocuments] = useState<MemoryDocument[]>([]);
  const [episodic, setEpisodic] = useState<EpisodicSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("_none_");

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const [docsRes, episodicRes] = await Promise.allSettled([
        agentId
          ? http.get<MemoryDocument[]>(`/v1/agents/${agentId}/memory/documents`)
          : http.get<MemoryDocument[]>("/v1/memory/documents"),
        agentId
          ? http.get<{ summaries: EpisodicSummary[] }>(`/v1/agents/${agentId}/memory/episodic`)
          : Promise.resolve({ summaries: [] as EpisodicSummary[] }),
      ]);

      if (docsRes.status === "fulfilled") {
        const d = docsRes.value;
        setDocuments(Array.isArray(d) ? d : []);
      }
      if (episodicRes.status === "fulfilled") {
        setEpisodic(episodicRes.value.summaries ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load memory");
    } finally {
      setLoading(false);
    }
  }, [http, connected, agentId]);

  const key = agentId ?? "_all_";
  useEffect(() => {
    if (connected && fetchedRef.current !== key) {
      fetchedRef.current = key;
      load();
    }
  }, [connected, key, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = "_none_";
  }, [connected]);

  const deleteDocument = useCallback(
    async (path: string) => {
      if (!http || !agentId) return;
      await http.delete(`/v1/agents/${agentId}/memory/documents/${encodeURIComponent(path)}`);
      setDocuments((prev) => prev.filter((d) => d.path !== path));
    },
    [http, agentId],
  );

  return { documents, episodic, loading, error, refresh: load, deleteDocument };
}
