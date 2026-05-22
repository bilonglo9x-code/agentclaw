import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AgentEventTypes, ChatEventTypes, Events } from "@/lib/api/protocol";

export interface LiveEvent {
  id: string;
  timestamp: number;
  source: "agent" | "chat" | "cron" | "system" | "trace";
  type: string;
  agentId?: string;
  agentName?: string;
  sessionKey?: string;
  summary: string;
  payload?: unknown;
  status?: "success" | "error" | "running";
}

const MAX_EVENTS = 200;

function summarizeAgentEvent(payload: Record<string, unknown>): { summary: string; status?: "success" | "error" | "running" } {
  const evType = payload.type as string;
  const agentName = (payload.agent_name ?? payload.agent_id ?? "Agent") as string;
  switch (evType) {
    case AgentEventTypes.RUN_STARTED: return { summary: `${agentName} bắt đầu chạy`, status: "running" };
    case AgentEventTypes.RUN_COMPLETED: return { summary: `${agentName} hoàn thành`, status: "success" };
    case AgentEventTypes.RUN_FAILED: return { summary: `${agentName} gặp lỗi: ${payload.error ?? "unknown"}`, status: "error" };
    case AgentEventTypes.RUN_CANCELLED: return { summary: `${agentName} bị hủy`, status: "error" };
    case AgentEventTypes.TOOL_CALL: return { summary: `${agentName} gọi tool: ${payload.tool_name ?? "unknown"}`, status: "running" };
    case AgentEventTypes.TOOL_RESULT: return { summary: `Tool ${payload.tool_name ?? ""} trả về kết quả` };
    case AgentEventTypes.BLOCK_REPLY: return { summary: `${agentName} gửi phản hồi` };
    default: return { summary: evType };
  }
}

function summarizeChatEvent(payload: Record<string, unknown>): string {
  const evType = payload.type as string;
  if (evType === ChatEventTypes.MESSAGE) return `Tin nhắn mới: ${String(payload.content ?? "").slice(0, 50)}`;
  if (evType === ChatEventTypes.THINKING) return "Agent đang suy nghĩ...";
  return evType;
}

export function useEvents() {
  const { ws, connected } = useAuth();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const counterRef = useRef(0);

  const addEvent = useCallback((ev: Omit<LiveEvent, "id" | "timestamp">) => {
    const id = `ev-${Date.now()}-${++counterRef.current}`;
    setEvents((prev) => {
      const next = [{ ...ev, id, timestamp: Date.now() }, ...prev];
      return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
    });
  }, []);

  useEffect(() => {
    if (!ws) return;

    const unsubAgent = ws.on(Events.AGENT, (payload) => {
      const p = payload as Record<string, unknown>;
      const { summary, status } = summarizeAgentEvent(p);
      addEvent({
        source: "agent",
        type: p.type as string ?? "agent",
        agentId: p.agent_id as string,
        agentName: p.agent_name as string,
        sessionKey: p.session_key as string,
        summary,
        status,
        payload: p,
      });
    });

    const unsubChat = ws.on(Events.CHAT, (payload) => {
      const p = payload as Record<string, unknown>;
      const summary = summarizeChatEvent(p);
      addEvent({
        source: "chat",
        type: p.type as string ?? "chat",
        agentId: p.agent_id as string,
        sessionKey: p.session_key as string,
        summary,
        payload: p,
      });
    });

    const unsubCron = ws.on(Events.CRON, (payload) => {
      const p = payload as Record<string, unknown>;
      addEvent({
        source: "cron",
        type: "cron",
        summary: `Cron job ${p.job_id ?? "unknown"}: ${p.status ?? "triggered"}`,
        status: p.status === "error" ? "error" : "success",
        payload: p,
      });
    });

    const unsubTrace = ws.on(Events.TRACE_STATUS, (payload) => {
      const p = payload as Record<string, unknown>;
      addEvent({
        source: "trace",
        type: "trace.status",
        agentId: p.agent_id as string,
        summary: `Trace ${(p.trace_id as string)?.slice(0, 8) ?? "?"} → ${p.status ?? "updated"}`,
        status: p.status === "failed" ? "error" : p.status === "completed" ? "success" : "running",
        payload: p,
      });
    });

    return () => {
      unsubAgent();
      unsubChat();
      unsubCron();
      unsubTrace();
    };
  }, [ws, addEvent]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, connected, clear };
}
