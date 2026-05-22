import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Methods } from "@/lib/api/protocol";

export interface SkillInfo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  version?: number;
  status: "active" | "inactive" | "archived";
  language?: string;
  tags?: string[];
  has_deps_issues?: boolean;
}

export function useSkills() {
  const { ws, http, connected } = useAuth();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      if (ws?.isConnected) {
        const res = await ws.call<{ skills: SkillInfo[] }>(Methods.SKILLS_LIST);
        setSkills(res.skills ?? []);
        return;
      }
      if (http) {
        const res = await http.get<{ skills: SkillInfo[] }>("/v1/skills");
        setSkills(res.skills ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
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

  return { skills, loading, error, refresh: load };
}
