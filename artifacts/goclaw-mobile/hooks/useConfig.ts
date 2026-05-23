import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface SystemConfig {
  raw?: string;
  hash?: string;
  path?: string;
  [key: string]: unknown;
}

export interface ConfigApplyResult {
  ok: boolean;
  config?: SystemConfig;
  hash?: string;
  restart?: boolean;
}

export function useConfig() {
  const { ws, connected } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ config: SystemConfig; hash: string; path: string }>(Methods.CONFIG_GET);
      setConfig({ ...(res.config ?? {}), hash: res.hash, path: res.path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải config");
    } finally {
      setLoading(false);
    }
  }, [ws, connected]);

  useEffect(() => {
    if (!connected || fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [connected, load]);

  useEffect(() => {
    if (!connected) {
      fetchedRef.current = false;
      setConfig(null);
    }
  }, [connected]);

  const applyConfig = useCallback(async (raw: string, baseHash?: string): Promise<ConfigApplyResult> => {
    if (!ws) throw new Error("Not connected");
    setApplying(true);
    setError(null);
    try {
      const res = await ws.call<ConfigApplyResult>(Methods.CONFIG_APPLY, { raw, baseHash });
      if (res.config) setConfig({ ...res.config, hash: res.hash });
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi apply config";
      setError(msg);
      throw e;
    } finally {
      setApplying(false);
    }
  }, [ws]);

  const patchConfig = useCallback(async (raw: string, baseHash?: string): Promise<ConfigApplyResult> => {
    if (!ws) throw new Error("Not connected");
    setApplying(true);
    setError(null);
    try {
      const res = await ws.call<ConfigApplyResult>(Methods.CONFIG_PATCH, { raw, baseHash });
      if (res.config) setConfig({ ...res.config, hash: res.hash });
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lỗi patch config";
      setError(msg);
      throw e;
    } finally {
      setApplying(false);
    }
  }, [ws]);

  return { config, loading, applying, error, load, applyConfig, patchConfig };
}
