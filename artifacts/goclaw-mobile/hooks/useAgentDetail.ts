import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface AgentDetail {
  id: string;
  agent_key: string;
  name?: string;
  description?: string;
  provider: string;
  model: string;
  status: "active" | "inactive" | "archived";
  agent_type?: string;
  is_default?: boolean;
  context_window?: number;
  max_tool_iterations?: number;
  workspace?: string;
  memory_enabled?: boolean;
  embedding_provider?: string;
  embedding_model?: string;
  skills?: string[];
  channels?: string[];
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgentFile {
  path: string;
  content: string;
  size?: number;
  updated_at?: string;
}

export function useAgentDetail(agentId: string | undefined) {
  const { ws, http, connected } = useAuth();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!agentId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      let agentData: AgentDetail | null = null;

      // Try HTTP first
      if (http) {
        try {
          agentData = await http.get<AgentDetail>(`/v1/agents/${agentId}`);
        } catch {
          // fall through to WS
        }
      }

      // WS fallback: get from agents.list
      if (!agentData && ws?.isConnected) {
        try {
          const res = await ws.call<{ agents: Array<{ id: string; name?: string; model: string; isRunning?: boolean; displayName?: string; agentType?: string; agentKey?: string; provider?: string; status?: string; description?: string }> }>(Methods.AGENTS_LIST);
          const raw = (res.agents ?? []).find((a) => a.id === agentId || a.agentKey === agentId);
          if (raw) {
            agentData = {
              id: raw.id,
              agent_key: raw.agentKey ?? raw.id,
              name: raw.displayName ?? raw.name ?? raw.id,
              provider: raw.provider ?? "",
              model: raw.model ?? "",
              status: raw.status === "active" ? "active" : "inactive",
              agent_type: raw.agentType,
              description: raw.description,
            };
          }
        } catch {
          // ignore
        }
      }

      if (agentData) {
        setAgent(agentData);
      } else {
        setError("Cannot load agent detail");
      }

      // Load files via WS
      if (ws?.isConnected) {
        try {
          const filesRes = await ws.call<{ files: AgentFile[] }>(Methods.AGENTS_FILES_LIST, { agentId });
          setFiles(filesRes.files ?? []);
        } catch {
          // files optional
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }, [agentId, ws, http, connected]);

  useEffect(() => {
    if (connected && agentId && fetchedRef.current !== agentId) {
      fetchedRef.current = agentId;
      load();
    }
  }, [connected, agentId, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = undefined;
  }, [connected]);

  return { agent, files, loading, error, refresh: load };
}
