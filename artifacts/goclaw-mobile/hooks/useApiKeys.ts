import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ApiKeyData {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreateInput {
  name: string;
  scopes: string[];
  expires_in?: number;
}

export interface ApiKeyCreateResponse extends ApiKeyData {
  key: string;
}

export function useApiKeys() {
  const { http, connected } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiKeyData[]>("/v1/api-keys");
      setApiKeys(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys");
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

  const createKey = useCallback(
    async (data: ApiKeyCreateInput): Promise<ApiKeyCreateResponse | null> => {
      if (!http) return null;
      const res = await http.post<ApiKeyCreateResponse>("/v1/api-keys", data);
      await load();
      return res;
    },
    [http, load],
  );

  const revokeKey = useCallback(
    async (id: string) => {
      if (!http) return;
      await http.post(`/v1/api-keys/${id}/revoke`, {});
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    },
    [http],
  );

  return { apiKeys, loading, error, refresh: load, createKey, revokeKey };
}
