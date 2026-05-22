export const PROTOCOL_VERSION = 3;

export const Methods = {
  CONNECT: "connect",
  HEALTH: "health",
  STATUS: "status",

  CHAT_SEND: "chat.send",
  CHAT_HISTORY: "chat.history",
  CHAT_ABORT: "chat.abort",

  AGENTS_LIST: "agents.list",
  AGENTS_CREATE: "agents.create",
  AGENTS_UPDATE: "agents.update",
  AGENTS_DELETE: "agents.delete",

  SESSIONS_LIST: "sessions.list",
  SESSIONS_PREVIEW: "sessions.preview",
  SESSIONS_PATCH: "sessions.patch",
  SESSIONS_DELETE: "sessions.delete",
  SESSIONS_RESET: "sessions.reset",

  SKILLS_LIST: "skills.list",
  SKILLS_GET: "skills.get",

  CRON_LIST: "cron.list",
  CRON_TOGGLE: "cron.toggle",
  CRON_RUN: "cron.run",

  CHANNELS_LIST: "channels.list",
  CHANNELS_STATUS: "channels.status",
  CHANNELS_TOGGLE: "channels.toggle",

  APPROVALS_LIST: "exec.approval.list",
  APPROVALS_APPROVE: "exec.approval.approve",
  APPROVALS_DENY: "exec.approval.deny",

  LOGS_TAIL: "logs.tail",

  USAGE_GET: "usage.get",
  USAGE_SUMMARY: "usage.summary",

  TEAMS_LIST: "teams.list",
  TEAMS_TASK_LIST: "teams.tasks.list",
} as const;

export const Events = {
  AGENT: "agent",
  CHAT: "chat",
  SESSION_UPDATED: "session.updated",
  HEARTBEAT: "heartbeat",
  LOG: "log",
  EXEC_APPROVAL_REQUESTED: "exec.approval.requested",
  EXEC_APPROVAL_RESOLVED: "exec.approval.resolved",
  HEALTH: "health",
} as const;

export const AgentEventTypes = {
  RUN_STARTED: "run.started",
  RUN_COMPLETED: "run.completed",
  RUN_FAILED: "run.failed",
  RUN_CANCELLED: "run.cancelled",
  TOOL_CALL: "tool.call",
  TOOL_RESULT: "tool.result",
  BLOCK_REPLY: "block.reply",
} as const;

export const ChatEventTypes = {
  CHUNK: "chunk",
  MESSAGE: "message",
  THINKING: "thinking",
} as const;
