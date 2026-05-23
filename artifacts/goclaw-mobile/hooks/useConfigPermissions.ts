import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface ConfigPermission {
  id: string;
  user_id: string;
  display_name?: string;
  path: string;
  access: "read" | "write" | "admin";
  granted_by?: string;
  granted_at?: string;
}

export function useConfigPermissions() {
  const { ws, connected } = useAuth();
  const [permissions, setPermissions] = useState<ConfigPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ permissions: ConfigPermission[]; count: number }>(
        Methods.CONFIG_PERMISSIONS_LIST,
      );
      setPermissions(res.permissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải config permissions");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  const grantPermission = useCallback(
    async (params: { userId: string; path: string; access: "read" | "write" | "admin" }): Promise<ConfigPermission> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      const res = await ws.call<{ permission: ConfigPermission }>(
        Methods.CONFIG_PERMISSIONS_GRANT,
        params,
      );
      const perm = res.permission;
      setPermissions((prev) => [perm, ...prev.filter((p) => !(p.user_id === params.userId && p.path === params.path))]);
      return perm;
    },
    [ws],
  );

  const revokePermission = useCallback(
    async (permissionId: string): Promise<void> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      await ws.call(Methods.CONFIG_PERMISSIONS_REVOKE, { permissionId });
      setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    },
    [ws],
  );

  return { permissions, loading, error, refresh: load, grantPermission, revokePermission };
}
