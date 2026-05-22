import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface AgentData {
  id: string;
  agent_key: string;
  display_name?: string;
  provider?: string;
  model: string;
  agent_type: "open" | "predefined";
  status?: string;
  workspace?: string;
  description?: string;
}

export function useAgents() {
  const { ws, http, connected } = useAuth();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!connected || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (http) {
          const res = await http.get<{ agents: AgentData[] }>("/v1/agents");
          if (res.agents && res.agents.length > 0) {
            setAgents(res.agents);
            return;
          }
        }

        if (ws) {
          const res = await ws.call<{ agents: { id: string; model: string; isRunning?: boolean; displayName?: string; agentType?: string }[] }>(
            Methods.AGENTS_LIST,
          );
          setAgents(
            (res.agents ?? []).map((a) => ({
              id: a.id,
              agent_key: a.id,
              display_name: a.displayName ?? a.id,
              model: a.model,
              agent_type: a.agentType === "predefined" ? "predefined" : "open",
              status: a.isRunning ? "active" : "idle",
            })),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    })();
  }, [connected, ws, http]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { agents, loading, error };
}
