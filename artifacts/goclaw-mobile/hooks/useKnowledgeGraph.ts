import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface KGEntity {
  id: string;
  agent_id: string;
  user_id?: string;
  name: string;
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
  relation_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface KGStats {
  entity_count: number;
  relation_count: number;
  entity_types: Record<string, number>;
}

export function useKnowledgeGraph(agentId?: string) {
  const { http, connected } = useAuth();
  const [entities, setEntities] = useState<KGEntity[]>([]);
  const [stats, setStats] = useState<KGStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    if (!http || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const [entRes, statsRes] = await Promise.allSettled([
        http.get<{ entities: KGEntity[] } | KGEntity[]>(
          `/v1/agents/${agentId}/kg/entities?limit=200`,
        ),
        http.get<KGStats>(`/v1/agents/${agentId}/kg/stats`),
      ]);
      if (entRes.status === "fulfilled") {
        const raw = entRes.value;
        setEntities(Array.isArray(raw) ? raw : ((raw as { entities: KGEntity[] }).entities ?? []));
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  }, [http, agentId]);

  const deleteEntity = useCallback(
    async (entityId: string): Promise<boolean> => {
      if (!http || !agentId) return false;
      try {
        await http.delete(`/v1/agents/${agentId}/kg/entities/${entityId}`);
        setEntities((prev) => prev.filter((e) => e.id !== entityId));
        return true;
      } catch {
        return false;
      }
    },
    [http, agentId],
  );

  const filteredEntities = search.trim()
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.type.toLowerCase().includes(search.toLowerCase()) ||
          (e.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : entities;

  useEffect(() => {
    if (connected && agentId) fetch();
  }, [connected, agentId, fetch]);

  return { entities: filteredEntities, allEntities: entities, stats, loading, error, search, setSearch, refresh: fetch, deleteEntity };
}
