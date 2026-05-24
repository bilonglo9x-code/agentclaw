import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

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

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (http) {
        try {
          const res = await http.get<{ agents: Array<any> }>("/v1/agents");
          if (res.agents && res.agents.length > 0) {
            setAgents(res.agents.map((a: any) => ({
              id: a.id,
              agent_key: a.agent_key ?? a.agentKey ?? a.id,
              display_name: a.display_name ?? a.displayName ?? a.name ?? a.agent_key,
              provider: a.provider,
              model: a.model ?? "",
              agent_type: (a.agent_type ?? a.agentType) === "predefined" ? "predefined" : "open",
              status: a.status ?? "idle",
              description: a.agent_description ?? a.description ?? a.frontmatter,
            })));
            return;
          }
        } catch {
          // fall through to WS
        }
      }

      if (ws) {
        const res = await ws.call<{ agents: { id: string; name?: string; model: string; isRunning?: boolean; displayName?: string; agentType?: string; agentKey?: string; provider?: string; status?: string; description?: string }[] }>(
          Methods.AGENTS_LIST,
        );
        setAgents(
          (res.agents ?? []).map((a) => ({
            id: a.id,
            agent_key: a.agentKey ?? a.id,
            display_name: a.displayName ?? a.name ?? a.id,
            provider: a.provider,
            model: a.model,
            agent_type: a.agentType === "predefined" ? "predefined" : "open",
            status: a.isRunning ? "active" : (a.status ?? "idle"),
            description: a.description,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [ws, http]);

  useEffect(() => {
    if (!connected || fetchedRef.current) return;
    fetchedRef.current = true;
    doFetch();
  }, [connected, doFetch]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  useEffect(() => {
    if (!ws) return;
    const unsub = ws.on(Events.AGENT, (payload: any) => {
      const key = payload?.agent_key ?? payload?.agentKey;
      const type = payload?.type ?? payload?.event_type;
      if (!key || !type) return;
      setAgents((prev) => prev.map((a) => {
        if (a.agent_key !== key && a.id !== key) return a;
        if (type === "run.started") return { ...a, status: "active" };
        if (type === "run.completed" || type === "run.failed") return { ...a, status: "idle" };
        return a;
      }));
    });
    return () => { unsub?.(); };
  }, [ws, connected]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    doFetch();
  }, [doFetch]);

  return { agents, loading, error, refresh };
}
