import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface AgentShare {
  user_id: string;
  agent_id: string;
  role: "user" | "admin";
  created_at?: string;
}

export function useShares(agentId: string | undefined) {
  const { http, connected } = useAuth();
  const [shares, setShares] = useState<AgentShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("_none_");

  const load = useCallback(async () => {
    if (!http || !connected || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ shares: AgentShare[] }>(`/v1/agents/${agentId}/shares`);
      setShares(res.shares ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải shares");
    } finally {
      setLoading(false);
    }
  }, [http, connected, agentId]);

  useEffect(() => {
    if (!connected || !agentId || fetchedRef.current === agentId) return;
    fetchedRef.current = agentId;
    load();
  }, [connected, agentId, load]);

  useEffect(() => {
    if (!connected) {
      fetchedRef.current = "_none_";
      setShares([]);
    }
  }, [connected]);

  const grantShare = useCallback(async (userId: string, role: "user" | "admin" = "user") => {
    if (!http || !agentId) throw new Error("Not connected");
    await http.post(`/v1/agents/${agentId}/shares`, { user_id: userId, role });
    await load();
  }, [http, agentId, load]);

  const revokeShare = useCallback(async (userId: string) => {
    if (!http || !agentId) throw new Error("Not connected");
    await http.delete(`/v1/agents/${agentId}/shares/${userId}`);
    setShares((prev) => prev.filter((s) => s.user_id !== userId));
  }, [http, agentId]);

  return { shares, loading, error, load, grantShare, revokeShare };
}
