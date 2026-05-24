import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface MCPServerData {
  id: string;
  name: string;
  display_name: string;
  transport: "stdio" | "sse" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  tool_prefix?: string;
  timeout_sec?: number;
  enabled: boolean;
  agent_count?: number;
  tool_count?: number;
  latency_ms?: number;
  created_at: string;
  updated_at: string;
}

export function useMCP() {
  const { http, connected } = useAuth();
  const [servers, setServers] = useState<MCPServerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ servers: MCPServerData[] }>("/v1/mcp/servers");
      setServers(res.servers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MCP servers");
    } finally {
      setLoading(false);
    }
  }, [http, connected]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      if (!http) return;
      await http.put(`/v1/mcp/servers/${id}`, { enabled });
      setServers((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    },
    [http],
  );

  const create = useCallback(
    async (params: {
      name: string;
      display_name: string;
      transport: "stdio" | "sse" | "streamable-http";
      command?: string;
      args?: string[];
      url?: string;
      tool_prefix?: string;
    }): Promise<MCPServerData> => {
      if (!http) throw new Error("Not connected");
      const res = await http.post<{ server: MCPServerData }>("/v1/mcp/servers", params);
      setServers((prev) => [res.server, ...prev]);
      return res.server;
    },
    [http],
  );

  const deleteServer = useCallback(
    async (id: string) => {
      if (!http) return;
      await http.delete(`/v1/mcp/servers/${id}`);
      setServers((prev) => prev.filter((s) => s.id !== id));
    },
    [http],
  );

  return { servers, loading, error, toggle, create, deleteServer, refresh: load };
}
