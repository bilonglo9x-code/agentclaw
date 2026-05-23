import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface AgentIdentity {
  id: string;
  agent_key: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  capabilities?: string[];
  public_info?: Record<string, string>;
  version?: string;
  created_at?: string;
  updated_at?: string;
}

export function useAgentIdentity(agentId: string | undefined) {
  const { ws, connected } = useAuth();
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!ws?.isConnected || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ identity: AgentIdentity }>(
        Methods.AGENT_IDENTITY_GET,
        { agentId },
      );
      setIdentity(res.identity ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải identity");
    } finally {
      setLoading(false);
    }
  }, [ws, agentId]);

  useEffect(() => {
    if (connected && agentId && fetchedRef.current !== agentId) {
      fetchedRef.current = agentId;
      load();
    }
  }, [connected, agentId, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = undefined;
  }, [connected]);

  return { identity, loading, error, refresh: load };
}
