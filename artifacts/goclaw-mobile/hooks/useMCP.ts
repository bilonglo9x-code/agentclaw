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

  return { servers, loading, error, toggle, refresh: load };
}
