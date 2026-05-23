import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface TenantUser {
  user_id: string;
  display_name?: string;
  email?: string;
  role: "owner" | "admin" | "operator" | "viewer";
  joined_at?: string;
  last_active_at?: string;
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  edition?: "standard" | "lite";
  owner_id?: string;
  agent_count?: number;
  user_count?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useTenants() {
  const { ws, connected, isMasterScope } = useAuth();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [mine, setMine] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const loadMine = useCallback(async () => {
    if (!ws?.isConnected) return;
    try {
      const res = await ws.call<{ tenant: TenantData }>(Methods.TENANTS_MINE);
      setMine(res.tenant ?? null);
    } catch {
      // ignore
    }
  }, [ws]);

  const loadAll = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ tenants: TenantData[]; count: number }>(Methods.TENANTS_LIST);
      setTenants(res.tenants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách tổ chức");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  const load = useCallback(async () => {
    await loadMine();
    if (isMasterScope) await loadAll();
  }, [loadMine, loadAll, isMasterScope]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const loadUsers = useCallback(
    async (tenantId: string): Promise<TenantUser[]> => {
      if (!ws?.isConnected) return [];
      const res = await ws.call<{ users: TenantUser[]; count: number }>(
        Methods.TENANTS_USERS_LIST,
        { tenantId },
      );
      return res.users ?? [];
    },
    [ws],
  );

  const getTenant = useCallback(
    async (tenantId: string): Promise<TenantData | null> => {
      if (!ws?.isConnected) return null;
      const res = await ws.call<{ tenant: TenantData }>(Methods.TENANTS_GET, { tenantId });
      return res.tenant ?? null;
    },
    [ws],
  );

  const createTenant = useCallback(
    async (params: { name: string; slug: string; plan?: string }): Promise<TenantData> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      const res = await ws.call<{ tenant: TenantData }>(Methods.TENANTS_CREATE, params);
      const tenant = res.tenant;
      setTenants((prev) => [tenant, ...prev]);
      return tenant;
    },
    [ws],
  );

  const updateTenant = useCallback(
    async (tenantId: string, params: { name?: string; slug?: string; plan?: string }): Promise<TenantData> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      const res = await ws.call<{ tenant: TenantData }>(Methods.TENANTS_UPDATE, { tenantId, ...params });
      const tenant = res.tenant;
      setTenants((prev) => prev.map((t) => (t.id === tenantId ? tenant : t)));
      if (mine?.id === tenantId) setMine(tenant);
      return tenant;
    },
    [ws, mine],
  );

  return {
    tenants,
    mine,
    loading,
    error,
    refresh: load,
    loadUsers,
    getTenant,
    createTenant,
    updateTenant,
    isMasterScope,
  };
}
