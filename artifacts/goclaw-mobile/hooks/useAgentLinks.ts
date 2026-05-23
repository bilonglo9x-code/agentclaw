import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface AgentLink {
  id: string;
  from_agent_id: string;
  from_agent_key?: string;
  to_agent_id: string;
  to_agent_key?: string;
  trigger_event: string;
  condition?: string;
  label?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useAgentLinks(agentId: string | undefined) {
  const { ws, connected } = useAuth();
  const [links, setLinks] = useState<AgentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!ws?.isConnected || !agentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ links: AgentLink[]; count: number }>(
        Methods.AGENTS_LINKS_LIST,
        { agentId },
      );
      setLinks(res.links ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải agent links");
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

  const createLink = useCallback(
    async (params: {
      toAgentId: string;
      triggerEvent: string;
      label?: string;
      condition?: string;
    }): Promise<AgentLink> => {
      if (!ws?.isConnected || !agentId) throw new Error("Not connected");
      const res = await ws.call<{ link: AgentLink }>(Methods.AGENTS_LINKS_CREATE, {
        agentId,
        ...params,
      });
      const link = res.link;
      setLinks((prev) => [link, ...prev]);
      return link;
    },
    [ws, agentId],
  );

  const updateLink = useCallback(
    async (linkId: string, params: { label?: string; enabled?: boolean; condition?: string }): Promise<void> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      await ws.call(Methods.AGENTS_LINKS_UPDATE, { linkId, ...params });
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, ...params } : l)),
      );
    },
    [ws],
  );

  const deleteLink = useCallback(
    async (linkId: string): Promise<void> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      await ws.call(Methods.AGENTS_LINKS_DELETE, { linkId });
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    },
    [ws],
  );

  return { links, loading, error, refresh: load, createLink, updateLink, deleteLink };
}
