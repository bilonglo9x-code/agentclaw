import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface AgentFormData {
  agent_key: string;
  name?: string;
  agent_description?: string;
  provider?: string;
  model?: string;
  agent_type?: "predefined" | "personal" | "shared" | "assistant";
  context_window?: number;
  max_tool_iterations?: number;
  status?: "active" | "inactive";
}

export function useCreateAgent() {
  const { http } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAgent = useCallback(
    async (data: AgentFormData): Promise<{ id: string; agent_key: string } | null> => {
      if (!http) { setError("Not connected"); return null; }
      setSaving(true);
      setError(null);
      try {
        const res = await http.post<{ id: string; agent_key: string }>("/v1/agents", data);
        return res;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create agent");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [http],
  );

  const updateAgent = useCallback(
    async (id: string, data: Partial<AgentFormData>): Promise<boolean> => {
      if (!http) { setError("Not connected"); return false; }
      setSaving(true);
      setError(null);
      try {
        await http.put(`/v1/agents/${id}`, data);
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update agent");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [http],
  );

  return { createAgent, updateAgent, saving, error, clearError: () => setError(null) };
}
