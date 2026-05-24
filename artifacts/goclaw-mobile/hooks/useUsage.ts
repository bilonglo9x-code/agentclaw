import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export interface UsageSummary {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  errors: number;
  unique_users: number;
  llm_calls: number;
  tool_calls: number;
  avg_duration_ms: number;
}

export interface UsagePoint {
  bucket_time: string;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  error_count: number;
}

interface SummaryResponse {
  current: UsageSummary;
  previous: UsageSummary;
}

function getFromTo(period: "today" | "7d" | "30d"): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  if (period === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  } else {
    from = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  }
  return { from: from.toISOString(), to };
}

export function useUsage(period: "today" | "7d" | "30d" = "today") {
  const { http, connected } = useAuth();
  const [summary, setSummary] = useState<{ current: UsageSummary; previous: UsageSummary } | null>(null);
  const [timeseries, setTimeseries] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!http || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getFromTo(period);
      const granularity = period === "today" ? "hour" : period === "7d" ? "day" : "week";

      const [summaryRes, tsRes] = await Promise.allSettled([
        http.get<SummaryResponse>("/v1/usage/summary", { from, to }),
        http.get<{ points: UsagePoint[] }>("/v1/usage/timeseries", {
          from,
          to,
          group_by: granularity,
        }),
      ]);

      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value);
      if (tsRes.status === "fulfilled") setTimeseries(tsRes.value.points ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [http, connected, period]);

  useEffect(() => {
    fetchedRef.current = false;
  }, [period]);

  useEffect(() => {
    if (connected && !fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
  }, [connected, load]);

  useEffect(() => {
    if (!connected) fetchedRef.current = false;
  }, [connected]);

  return { summary, timeseries, loading, error, refresh: load };
}
