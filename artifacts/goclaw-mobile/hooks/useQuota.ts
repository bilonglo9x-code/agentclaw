import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface QuotaItem {
  key: string;
  label?: string;
  used: number;
  limit: number;
  unit?: string;
}

export interface QuotaData {
  period: string;
  reset_at?: string;
  total_used: number;
  total_limit: number;
  items: QuotaItem[];
}

export function useQuota() {
  const { ws, connected } = useAuth();
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<QuotaData>(Methods.QUOTA_USAGE);
      setQuota(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải quota");
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

  const usagePercent = quota && quota.total_limit > 0
    ? Math.round((quota.total_used / quota.total_limit) * 100)
    : 0;

  const isNearLimit = usagePercent >= 80;
  const isOverLimit = usagePercent >= 100;

  return { quota, loading, error, refresh: load, usagePercent, isNearLimit, isOverLimit };
}
