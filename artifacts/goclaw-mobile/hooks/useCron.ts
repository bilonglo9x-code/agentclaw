import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export interface CronSchedule {
  kind: "at" | "every" | "cron";
  atMs?: number;
  everyMs?: number;
  expr?: string;
  tz?: string;
}

export interface CronJob {
  id: string;
  name: string;
  agentId?: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload?: { kind: string; message: string; command?: string };
  wakeHeartbeat?: boolean;
  deleteAfterRun?: boolean;
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
  createdAtMs: number;
  updatedAtMs: number;
}

export function useCron() {
  const { ws, connected } = useAuth();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ jobs: CronJob[] }>(Methods.CRON_LIST);
      setJobs(res.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cron jobs");
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

  useEffect(() => {
    if (!ws) return;
    return ws.on(Events.CRON, () => {
      load();
    });
  }, [ws, load]);

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.CRON_TOGGLE, { id, enabled });
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled } : j)));
    },
    [ws],
  );

  const run = useCallback(
    async (id: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.CRON_RUN, { id });
    },
    [ws],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.CRON_DELETE, { id });
      setJobs((prev) => prev.filter((j) => j.id !== id));
    },
    [ws],
  );

  return { jobs, loading, error, toggle, run, remove, refresh: load };
}
