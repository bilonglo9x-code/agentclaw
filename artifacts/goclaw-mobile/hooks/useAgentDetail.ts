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
  content?: string;
  size?: number;
  missing?: boolean;
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

      // Try HTTP first (CORS configured for mobile.vnsi.app)
      if (http) {
        try {
          const raw = await http.get<any>(`/v1/agents/${agentId}`);
          if (raw && (raw.agent_key || raw.id)) {
            agentData = {
              id: raw.id,
              agent_key: raw.agent_key ?? raw.id,
              name: raw.display_name ?? raw.name ?? raw.agent_key,
              description: raw.agent_description ?? raw.description ?? raw.frontmatter,
              provider: raw.provider ?? "",
              model: raw.model ?? "",
              status: raw.status ?? "active",
              agent_type: raw.agent_type,
              is_default: raw.is_default,
              context_window: raw.context_window,
              max_tool_iterations: raw.max_tool_iterations,
              workspace: raw.workspace,
              memory_enabled: raw.memory_config?.enabled ?? raw.memory_enabled ?? false,
              embedding_provider: raw.embedding_provider,
              embedding_model: raw.embedding_model,
              skills: raw.skills,
              channels: raw.channels,
              owner_id: raw.owner_id,
              created_at: raw.created_at,
              updated_at: raw.updated_at,
              ...(raw.temperature != null ? { temperature: raw.temperature } : {}),
              ...(raw.max_tokens != null ? { max_tokens: raw.max_tokens } : {}),
            };
          }
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
          const filesRes = await ws.call<{ files: Array<{ name?: string; path?: string; size?: number; missing?: boolean; content?: string }> }>(Methods.AGENTS_FILES_LIST, { agentId });
          setFiles((filesRes.files ?? []).map((f) => ({
            path: f.path ?? f.name ?? "",
            content: f.content,
            size: f.size,
            missing: f.missing,
          })));
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
