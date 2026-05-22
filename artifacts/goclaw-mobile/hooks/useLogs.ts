import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods } from "@/lib/api/protocol";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  source?: string;
  attrs?: Record<string, string>;
}

const MAX_LOGS = 500;

export function useLogs() {
  const { ws, connected } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tailing, setTailing] = useState(false);
  const [level, setLevelState] = useState<LogLevel>("info");
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);

  const startTail = useCallback(
    async (lvl?: LogLevel) => {
      if (!ws?.isConnected) return;
      const target = lvl ?? level;
      setError(null);
      try {
        await ws.call(Methods.LOGS_TAIL, { action: "start", level: target });
        setTailing(true);
        setLevelState(target);
      } catch {
        setError("logs.tail not available on this backend");
      }
    },
    [ws, level],
  );

  const stopTail = useCallback(async () => {
    if (!ws?.isConnected) return;
    try {
      await ws.call(Methods.LOGS_TAIL, { action: "stop" });
    } catch {}
    setTailing(false);
  }, [ws]);

  const clearLogs = useCallback(() => setLogs([]), []);

  useEffect(() => {
    if (!ws) return;
    return ws.on(Events.LOG, (payload) => {
      const entry = payload as Omit<LogEntry, "id">;
      if (!entry) return;
      const id = `log-${Date.now()}-${++counterRef.current}`;
      setLogs((prev) => {
        const next = [...prev, { ...entry, id }];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    });
  }, [ws]);

  useEffect(() => {
    if (!connected) setTailing(false);
  }, [connected]);

  const setLevel = useCallback(
    (lvl: LogLevel) => {
      setLevelState(lvl);
      if (tailing) startTail(lvl);
    },
    [tailing, startTail],
  );

  return { logs, tailing, level, error, startTail, stopTail, clearLogs, setLevel };
}
