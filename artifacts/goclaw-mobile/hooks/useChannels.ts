import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export type ChannelState = "registered" | "starting" | "healthy" | "degraded" | "failed" | "stopped";

export interface ChannelStatus {
  enabled: boolean;
  running: boolean;
  state?: ChannelState;
  summary?: string;
  detail?: string;
  failure_kind?: "auth" | "config" | "network" | "unknown";
  retryable?: boolean;
  checked_at?: string;
  failure_count?: number;
  consecutive_failures?: number;
  first_failed_at?: string;
  last_failed_at?: string;
  last_healthy_at?: string;
}

export interface ChannelInstance {
  id: string;
  name: string;
  display_name: string;
  channel_type: string;
  agent_id: string;
  enabled: boolean;
  is_default: boolean;
  has_credentials: boolean;
  created_at: string;
}

export function useChannels() {
  const { ws, http, connected } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
  const [instances, setInstances] = useState<ChannelInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, instancesRes] = await Promise.allSettled([
        ws?.isConnected
          ? ws.call<{ channels: Record<string, ChannelStatus> }>(Methods.CHANNELS_STATUS)
          : Promise.reject(new Error("no ws")),
        ws?.isConnected
          ? ws.call<{ instances: ChannelInstance[] }>(Methods.CHANNEL_INSTANCES_LIST)
          : http?.get<{ instances: ChannelInstance[] }>("/v1/channels/instances") ?? Promise.reject(new Error("no http")),
      ]);

      if (statusRes.status === "fulfilled") {
        setStatuses(statusRes.value.channels ?? {});
      }
      if (instancesRes.status === "fulfilled") {
        setInstances(instancesRes.value.instances ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [ws, http, connected]);

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
    async (instanceId: string, enabled: boolean) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.CHANNELS_TOGGLE, { instanceId, enabled });
      setInstances((prev) =>
        prev.map((inst) => (inst.id === instanceId ? { ...inst, enabled } : inst)),
      );
    },
    [ws],
  );

  const create = useCallback(
    async (params: {
      name: string;
      display_name: string;
      channel_type: string;
      agent_id: string;
    }): Promise<ChannelInstance> => {
      if (!ws?.isConnected) throw new Error("Not connected");
      const res = await ws.call<{ instance: ChannelInstance }>(Methods.CHANNEL_INSTANCES_CREATE, params);
      setInstances((prev) => [res.instance, ...prev]);
      return res.instance;
    },
    [ws],
  );

  return { statuses, instances, loading, error, toggle, create, refresh: load };
}
