import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Events, Methods, AgentEventTypes, ChatEventTypes } from "@/lib/api/protocol";

export interface AttachedImage {
  uri: string;
  name: string;
  mimeType: string;
  /** Web-only: raw File object kept for FormData upload (data: URIs can't be appended on browsers) */
  file?: File;
}

export interface MediaRef {
  id: string;
  mime_type: string;
  kind: string;
  path?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  thinking?: string;
  tool_calls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  created_at?: string;
  isStreaming?: boolean;
  toolName?: string;
  /** local-only: image URIs attached before upload, for optimistic display */
  attachedImages?: AttachedImage[];
  /** server-side media references from history */
  media_refs?: MediaRef[];
}

export function useMessages(sessionKey: string) {
  const { ws, http, connected, serverUrl } = useAuth();
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
    async (message: string, images?: AttachedImage[]) => {
      if (!ws?.isConnected || !sessionKey) return;
      if (!message.trim() && (!images || images.length === 0)) return;
      setSending(true);

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: message.trim(),
          created_at: new Date().toISOString(),
          attachedImages: images && images.length > 0 ? images : undefined,
        },
      ]);

      let mediaItems: { path: string; filename: string }[] | undefined;
      if (images && images.length > 0 && http) {
        try {
          const uploads = await Promise.all(
            images.map(async (img) => {
              const fd = new FormData();
              if (img.file) {
                // Web: append native File object (data: URIs are not valid FormData blobs in browsers)
                fd.append("file", img.file, img.name);
              } else {
                // React Native: uri-object pattern understood by RN's fetch polyfill
                fd.append("file", { uri: img.uri, name: img.name, type: img.mimeType } as unknown as Blob);
              }
              const res = await http.postForm<{ path: string; filename: string; mime_type: string }>("/v1/media/upload", fd);
              return { path: res.path, filename: res.filename ?? img.name };
            }),
          );
          mediaItems = uploads;
        } catch (uploadErr) {
          console.warn("[useMessages] image upload failed, sending without media:", uploadErr);
        }
      }

      // If upload failed and there's no text either, nothing useful to send
      if (!message.trim() && (!mediaItems || mediaItems.length === 0)) {
        setSending(false);
        return;
      }

      try {
        await ws.call(
          Methods.CHAT_SEND,
          {
            sessionKey,
            message: message.trim(),
            ...(mediaItems && mediaItems.length > 0 ? { media: mediaItems } : {}),
          },
          30_000,
        );
      } catch (sendErr) {
        console.warn("[useMessages] CHAT_SEND failed:", sendErr);
      } finally {
        setSending(false);
      }
    },
    [ws, http, sessionKey],
  );

  const abort = useCallback(async () => {
    if (!ws?.isConnected || !sessionKey) return;
    await ws.call(Methods.CHAT_ABORT, { sessionKey }).catch(() => {});
  }, [ws, sessionKey]);

  return { messages, loading, sending, isRunning, activity, send, abort, reload: loadHistory };
}
