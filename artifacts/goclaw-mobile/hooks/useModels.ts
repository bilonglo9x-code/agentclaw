import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface ModelInfo {
  name: string;
  provider: string;
  display_name?: string;
  context_window?: number;
  max_output_tokens?: number;
  capabilities?: string[];
  enabled?: boolean;
  is_default?: boolean;
}

export function useModels() {
  const { ws, connected, http } = useAuth();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (ws?.isConnected) {
        const res = await ws.call<{ models: ModelInfo[] }>(Methods.MODELS_LIST, {});
        setModels(res.models ?? []);
      } else if (http) {
        const res = await http.get<{ models: ModelInfo[] }>("/v1/models");
        setModels(res.models ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [ws, http]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { models, loading, error, refresh: load };
}
