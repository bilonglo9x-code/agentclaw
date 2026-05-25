import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods, AgentEventTypes, ChatEventTypes } from "@/lib/api/protocol";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  created_at?: string;
  isStreaming?: boolean;
  toolName?: string;
}

export function useMessages(sessionKey: string) {
  const { ws, connected } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!ws?.isConnected || !sessionKey) return;
    setLoading(true);
    try {
      const res = await ws.call<{ messages: Omit<Message, "id">[] }>(Methods.CHAT_HISTORY, {
        sessionKey,
      });
      const msgs = (res.messages ?? []).map((m, i) => ({
        ...m,
        id: `hist-${i}-${Date.now()}`,
      }));
      setMessages(msgs);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [ws, sessionKey]);

  useEffect(() => {
    if (connected && sessionKey) loadHistory();
  }, [connected, sessionKey, loadHistory]);

  useEffect(() => {
    if (!ws) return;

    const unsubAgent = ws.on(Events.AGENT, (payload) => {
      const event = payload as {
        type: string;
        sessionKey?: string;
        payload?: { content?: string; phase?: string; tool?: string; name?: string };
      };
      if (event.sessionKey && event.sessionKey !== sessionKey) return;

      if (event.type === AgentEventTypes.RUN_STARTED) {
        setIsRunning(true);
        setActivity("thinking");
        const id = `streaming-${Date.now()}`;
        streamingIdRef.current = id;
        setMessages((prev) => [...prev, { id, role: "assistant", content: "", isStreaming: true }]);
      } else if (event.type === AgentEventTypes.TOOL_CALL) {
        setActivity(`tool: ${event.payload?.name ?? "..."}`);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, toolName: event.payload?.name }
              : m,
          ),
        );
      } else if (event.type === AgentEventTypes.RUN_COMPLETED || event.type === AgentEventTypes.RUN_FAILED) {
        setIsRunning(false);
        setActivity(null);
        streamingIdRef.current = null;
        loadHistory();
      }
    });

    const unsubChat = ws.on(Events.CHAT, (payload) => {
      const event = payload as {
        type: string;
        sessionKey?: string;
        payload?: { content?: string };
      };
      if (event.sessionKey && event.sessionKey !== sessionKey) return;

      if (event.type === ChatEventTypes.CHUNK && streamingIdRef.current) {
        const chunk = event.payload?.content ?? "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, content: m.content + chunk, isStreaming: true }
              : m,
          ),
        );
      }
    });

    return () => {
      unsubAgent();
      unsubChat();
    };
  }, [ws, sessionKey, loadHistory]);

  const send = useCallback(
    async (message: string) => {
      if (!ws?.isConnected || !sessionKey || !message.trim()) return;
      setSending(true);

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: message.trim(), created_at: new Date().toISOString() },
      ]);

      try {
        await ws.call(Methods.CHAT_SEND, { sessionKey, message: message.trim() }, 5_000);
      } catch {
      } finally {
        setSending(false);
      }
    },
    [ws, sessionKey],
  );

  const abort = useCallback(async () => {
    if (!ws?.isConnected || !sessionKey) return;
    await ws.call(Methods.CHAT_ABORT, { sessionKey }).catch(() => {});
  }, [ws, sessionKey]);

  return { messages, loading, sending, isRunning, activity, send, abort, reload: loadHistory };
}
