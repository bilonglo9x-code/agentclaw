import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export interface ApprovalItem {
  id: string;
  session_key?: string;
  agent_id?: string;
  agent_name?: string;
  tool_name: string;
  description?: string;
  args?: Record<string, unknown>;
  requested_at: string;
  status: "pending" | "approved" | "denied";
  risk_level?: "low" | "medium" | "high";
}

export function useApprovals() {
  const { ws, connected } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ approvals: ApprovalItem[] }>(Methods.APPROVALS_LIST);
      setApprovals(res.approvals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load approvals");
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
    const unsubReq = ws.on(Events.EXEC_APPROVAL_REQUESTED, (payload) => {
      const item = payload as ApprovalItem;
      if (!item?.id) return;
      setApprovals((prev) => {
        if (prev.find((a) => a.id === item.id)) return prev;
        return [item, ...prev];
      });
    });
    const unsubRes = ws.on(Events.EXEC_APPROVAL_RESOLVED, (payload) => {
      const evt = payload as { id?: string; status?: string };
      if (!evt?.id) return;
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === evt.id ? { ...a, status: (evt.status ?? "approved") as "approved" | "denied" } : a,
        ),
      );
    });
    return () => {
      unsubReq();
      unsubRes();
    };
  }, [ws]);

  const approve = useCallback(
    async (id: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.APPROVALS_APPROVE, { id });
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "approved" } : a)));
    },
    [ws],
  );

  const deny = useCallback(
    async (id: string, reason?: string) => {
      if (!ws?.isConnected) return;
      await ws.call(Methods.APPROVALS_DENY, { id, reason });
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "denied" } : a)));
    },
    [ws],
  );

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return { approvals, loading, error, approve, deny, pendingCount, refresh: load };
}
