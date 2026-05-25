import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ProviderData {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  api_base?: string;
  api_key?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderCreateData {
  name: string;
  display_name?: string;
  provider_type: string;
  api_base?: string;
  api_key?: string;
  enabled?: boolean;
}

export function useProviders() {
  const { http, connected } = useAuth();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<{ providers: ProviderData[] }>("/v1/providers");
      setProviders(res.providers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load providers");
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
      await http.put(`/v1/providers/${id}`, { enabled });
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled } : p)),
      );
    },
    [http],
  );

  const create = useCallback(
    async (data: ProviderCreateData): Promise<ProviderData | null> => {
      if (!http) return null;
      try {
        const res = await http.post<ProviderData>("/v1/providers", data);
        setProviders((prev) => [...prev, res]);
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create provider");
        return null;
      }
    },
    [http],
  );

  const update = useCallback(
    async (id: string, data: Partial<ProviderCreateData>): Promise<boolean> => {
      if (!http) return false;
      try {
        const res = await http.put<ProviderData>(`/v1/providers/${id}`, data);
        setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...res } : p)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update provider");
        return false;
      }
    },
    [http],
  );

  const deleteProvider = useCallback(
    async (id: string): Promise<boolean> => {
      if (!http) return false;
      try {
        await http.delete(`/v1/providers/${id}`);
        setProviders((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete provider");
        return false;
      }
    },
    [http],
  );

  return { providers, loading, error, toggle, refresh: load, create, update, deleteProvider };
}
