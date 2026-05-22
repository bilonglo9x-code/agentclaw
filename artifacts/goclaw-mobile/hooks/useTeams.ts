import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export interface TeamMember {
  team_id: string;
  agent_id: string;
  agent_key?: string;
  display_name?: string;
  role: "lead" | "member" | "reviewer";
}

export interface TeamData {
  id: string;
  name: string;
  lead_agent_id: string;
  lead_agent_key?: string;
  lead_display_name?: string;
  description?: string;
  status: "active" | "archived";
  member_count?: number;
  members?: TeamMember[];
  created_at?: string;
  updated_at?: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed" | "in_review" | "cancelled";

export interface TeamTask {
  id: string;
  team_id: string;
  subject: string;
  description?: string;
  status: TaskStatus;
  owner_agent_id?: string;
  owner_agent_key?: string;
  priority?: number;
  channel?: string;
  created_at?: string;
  updated_at?: string;
}

export function useTeams() {
  const { ws, connected } = useAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!ws?.isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ws.call<{ teams: TeamData[]; count: number }>(Methods.TEAMS_LIST);
      setTeams(res.teams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teams");
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
    const unsub = ws.on(Events.AGENT, () => load());
    return unsub;
  }, [ws, load]);

  const loadTasks = useCallback(
    async (teamId: string, status?: string): Promise<TeamTask[]> => {
      if (!ws?.isConnected) return [];
      const res = await ws.call<{ tasks: TeamTask[]; count: number }>(
        Methods.TEAMS_TASK_LIST,
        { teamId, status: status ?? "", channel: "", chatId: "" },
      );
      return res.tasks ?? [];
    },
    [ws],
  );

  return { teams, loading, error, refresh: load, loadTasks };
}
