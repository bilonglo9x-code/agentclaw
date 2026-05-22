import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface VaultDocument {
  id: string;
  agent_id?: string | null;
  team_id?: string;
  scope: "personal" | "team" | "shared";
  custom_scope?: string;
  path: string;
  title: string;
  doc_type: "context" | "memory" | "note" | "skill" | "episodic" | "media" | "document";
  summary?: string;
  created_at: string;
  updated_at: string;
}

export type VaultScope = "all" | "personal" | "team" | "shared";
export type VaultDocType = "all" | "context" | "note" | "skill" | "document" | "media";

export function useVault(scope: VaultScope = "all", docType: VaultDocType = "all") {
  const { http, connected } = useAuth();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("_none_");

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (scope !== "all") params.scope = scope;
      if (docType !== "all") params.doc_type = docType;
      const res = await http.get<{ documents: VaultDocument[]; total: number }>("/v1/vault/documents", params);
      setDocuments(res.documents ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vault");
    } finally {
      setLoading(false);
    }
  }, [http, connected, scope, docType]);

  const cacheKey = `${scope}-${docType}`;
  useEffect(() => {
    if (connected && fetchedRef.current !== cacheKey) {
      fetchedRef.current = cacheKey;
      load();
    }
  }, [connected, cacheKey, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = "_none_";
  }, [connected]);

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!http) return;
      await http.delete(`/v1/vault/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setTotal((t) => t - 1);
    },
    [http],
  );

  return { documents, total, loading, error, refresh: load, deleteDocument };
}
