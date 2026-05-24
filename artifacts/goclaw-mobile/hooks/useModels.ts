import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProviders } from "@/hooks/useProviders";

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

export function useModels(targetProvider?: string) {
  const { connected, http } = useAuth();
  const { providers } = useProviders();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string>("");

  const load = useCallback(async (providerNameOrId?: string) => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const allModels: ModelInfo[] = [];
      // Determine which providers to fetch
      const targetProviders = providerNameOrId
        ? providers.filter((p) => p.name === providerNameOrId || p.id === providerNameOrId)
        : providers;

      if (targetProviders.length === 0 && providerNameOrId) {
        // Try by id directly
        const res = await http.get<{ models: Array<{ id: string; name?: string; type?: string }> }>(`/v1/providers/${encodeURIComponent(providerNameOrId)}/models`);
        (res.models ?? []).forEach((m) => {
          allModels.push({ name: m.id ?? m.name ?? "", provider: providerNameOrId, display_name: m.name });
        });
      } else {
        await Promise.allSettled(
          targetProviders.map(async (p) => {
            try {
              const res = await http.get<{ models: Array<{ id: string; name?: string; type?: string }> }>(`/v1/providers/${p.id}/models`);
              (res.models ?? []).forEach((m) => {
                allModels.push({ name: m.id ?? m.name ?? "", provider: p.name ?? p.id, display_name: m.name });
              });
            } catch {
              // skip this provider
            }
          })
        );
      }
      setModels(allModels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [http, connected, providers]);

  useEffect(() => {
    const key = targetProvider ?? "__all__";
    if (connected && providers.length > 0 && fetchedRef.current !== key) {
      fetchedRef.current = key;
      load(targetProvider);
    }
  }, [connected, providers, targetProvider, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = "";
  }, [connected]);

  return { models, loading, error, refresh: () => load(targetProvider) };
}
