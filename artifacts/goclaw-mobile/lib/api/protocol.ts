export const PROTOCOL_VERSION = 3;

export const Methods = {
  CONNECT: "connect",
  HEALTH: "health",
  CHAT_SEND: "chat.send",
  CHAT_HISTORY: "chat.history",
  CHAT_ABORT: "chat.abort",
  AGENTS_LIST: "agents.list",
  SESSIONS_LIST: "sessions.list",
  SESSIONS_PREVIEW: "sessions.preview",
  SESSIONS_PATCH: "sessions.patch",
  SESSIONS_DELETE: "sessions.delete",
  SESSIONS_RESET: "sessions.reset",
} as const;

export const Events = {
  AGENT: "agent",
  CHAT: "chat",
  SESSION_UPDATED: "session.updated",
  HEARTBEAT: "heartbeat",
} as const;

export const AgentEventTypes = {
  RUN_STARTED: "run.started",
  RUN_COMPLETED: "run.completed",
  RUN_FAILED: "run.failed",
  TOOL_CALL: "tool.call",
  TOOL_RESULT: "tool.result",
} as const;

export const ChatEventTypes = {
  CHUNK: "chunk",
  MESSAGE: "message",
  THINKING: "thinking",
} as const;
