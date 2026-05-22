# GoClaw Mobile

Mobile AI agent platform app (React Native / Expo) that connects to the GoClaw Go backend. Lets users chat with AI agents, manage sessions, monitor logs, and browse agent configurations from their phone.

## Run & Operate

- `pnpm --filter @workspace/goclaw-mobile run dev` — run Expo dev server
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native + Expo ~54 + expo-router ~6
- API: Express 5 (api-server artifact)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`)

## Where things live

- `artifacts/goclaw-mobile/` — Expo React Native app
  - `app/` — expo-router screens (5 tabs + detail screens + login)
  - `app/(tabs)/` — Chat list, Agents grid, Dashboard, Monitor, More
  - `app/chat/[id].tsx` — Individual chat screen with WS messaging + streaming
  - `app/login.tsx` — Server URL + API token login screen
  - `app/traces.tsx` — Execution traces list (HTTP `/v1/traces`) with status/cost/duration
  - `app/approvals.tsx` — Approve/deny tool executions (WS `exec.approval.*` + real-time events)
  - `app/skills.tsx` — Skills list (WS `skills.list`) with language badges, deps warnings
  - `context/AuthContext.tsx` — Auth state, AsyncStorage persistence, WS+HTTP client lifecycle
  - `context/AppContext.tsx` — Mock/demo data context (fallback when not connected)
  - `lib/api/protocol.ts` — WS method/event constants (mirrors Go backend protocol)
  - `lib/api/ws-client.ts` — WebSocket JSON-RPC client (full auth + reconnect)
  - `lib/api/http-client.ts` — HTTP REST client with auth headers
  - `hooks/useAgents.ts` — Fetch agents via HTTP `/v1/agents`, fallback to WS `agents.list`
  - `hooks/useSessions.ts` — List sessions via WS `sessions.list`
  - `hooks/useMessages.ts` — Chat history + send via WS + streaming events
  - `hooks/useLogs.ts` — WS `logs.tail` with `log` event subscription; real-time log streaming
  - `hooks/useUsage.ts` — HTTP `/v1/usage/summary` + `/v1/usage/timeseries`; period filter (today/7d/30d)
  - `hooks/useTraces.ts` — HTTP `/v1/traces`; refreshes on agent events
  - `hooks/useApprovals.ts` — WS `exec.approval.list` + `exec.approval.requested/resolved` events; approve/deny
  - `hooks/useSkills.ts` — WS `skills.list` with HTTP fallback
  - `hooks/useChannels.ts` — WS `channels.status` + `channels.instances.list`; toggle enable/disable
  - `hooks/useProviders.ts` — HTTP `/v1/providers`; toggle enable/disable
  - `hooks/useCron.ts` — WS `cron.list` + toggle/run/delete; subscribes to `cron` WS events
  - `hooks/useMCP.ts` — HTTP `/v1/mcp/servers`; toggle enable/disable
  - `hooks/useAgentDetail.ts` — HTTP `/v1/agents/:id` + WS `agents.files.list` per agent
  - `hooks/useEvents.ts` — WS live event subscriber for agent/chat/cron/trace events
  - `app/agent/[id].tsx` — Agent detail (4 tabs: overview/files/sessions/config); Edit button → create.tsx; provider, model, memory status
  - `app/channels.tsx` — Channels list with status badges, toggle, credentials warning
  - `app/providers.tsx` — LLM provider list with type icons, toggle enable/disable
  - `app/cron.tsx` — Cron job list with schedule, next/last run, toggle, run-now alert
  - `app/mcp.tsx` — MCP server list with transport badges, endpoint, agent count, toggle
  - `app/events.tsx` — Live WS event feed (agent/chat/cron/trace) with mock fallback
  - `app/memory.tsx` — Memory docs + episodic summaries; tabs by type; agent filter; delete docs per agent
  - `app/vault.tsx` — Vault document library; scope (personal/team/shared) + doc_type filters; color-coded types
  - `app/teams.tsx` — Teams list with expandable task list per team; task status badges; member count
  - `app/contacts.tsx` — Channel contacts list; search + channel type filter; avatar with channel badge
  - `app/api-keys.tsx` — API key management; revoke; create modal with scope picker; new key copy flow
  - `app/activity.tsx` — Audit activity log; action + entity filters; actor/IP display
  - `app/storage.tsx` — File browser tree; expand dirs; long-press to delete; lock badge for protected files
  - `app/packages.tsx` — pip/npm/system/GitHub package list; install bar for pip & npm
  - `app/sessions.tsx` — Sessions list with agent filter; msg/token stats; delete; channel badges
  - `app/health.tsx` — Heartbeat targets; uptime %; status badge; test button; toggle enable
  - `hooks/useStorage.ts` — HTTP `/v1/storage/files`; list + subtree + delete
  - `hooks/usePackages.ts` — HTTP `/v1/packages` + `/v1/packages/install`
  - `hooks/useSessionsHistory.ts` — WS `sessions.list` + `sessions.delete` + `sessions.reset`
  - `hooks/useHeartbeat.ts` — WS `heartbeat.get` + `heartbeat.targets` + test/toggle
  - `hooks/useCreateAgent.ts` — POST `/v1/agents`, PUT `/v1/agents/:id`; create + update agent
  - `hooks/useVoices.ts` — GET `/v1/voices`, POST `/v1/voices/refresh`, POST `/v1/tts/synthesize`
  - `hooks/useBackup.ts` — GET `/v1/system/backup/preflight`, POST `/v1/system/backup`, POST `/v1/system/restore`
  - `hooks/useEvolution.ts` — GET/PATCH `/v1/agents/:id/evolution/suggestions`, GET `/v1/agents/:id/evolution/metrics`
  - `hooks/useKnowledgeGraph.ts` — GET `/v1/agents/:id/kg/entities`, GET `/v1/agents/:id/kg/stats`, DELETE entity
  - `app/agent/create.tsx` — Create & Edit agent form; agent_key, name, provider, model, type, description, context_window
  - `app/backup.tsx` — Backup & Restore; preflight disk info, trigger backup, download URL, restore upload
  - `app/voice.tsx` — Voice/TTS browser; provider filter, gender, language, preview button
  - `app/evolution.tsx` — Agent Evolution; per-agent suggestions list; approve/reject; tool metrics chart
  - `app/knowledge-graph.tsx` — Knowledge Graph; entity list with type color-coding; stats; delete entity
  - `app/search.tsx` — Global search; searches agents + sessions + vault + memory; category filter; quick links
  - `constants/colors.ts` — Dark zinc theme (amber #f97316 primary)
  - `components/` — Shared UI: ConversationItem, AgentCard, SearchBar, EmptyState
- `artifacts/api-server/` — Express API server
- `lib/` — Shared TypeScript libs

## Architecture decisions

- **Offline-first demo**: All screens show mock data from AppContext when not connected to a real server. When connected, real data from WS/HTTP hooks takes precedence.
- **Auth flow**: Token + server URL stored in AsyncStorage (`goclaw:auth`). On app start, restored automatically. Login screen available via the cloud icon in the header or `/login` route.
- **WebSocket protocol**: Matches GoClaw Go backend exactly — `{type:"req",id,method,params}` → `{type:"res",id,ok,payload}` + `{type:"event",event,payload}`. Protocol version 3. Connect method authenticates with token + userId + senderID.
- **Dual data source**: Screens check `connected` from AuthContext and use real hooks (useAgents, useSessions, useMessages) when connected, falling back to AppContext mock data for demo.
- **Dark-only theme**: `userInterfaceStyle: "dark"` in app.json, all colors defined as dark zinc palette.

## Product

- **5-tab navigation**: Chat (sessions list), Agents (grid), Dashboard (stats/charts), Monitor (live logs), More (settings/admin)
- **Real-time chat**: WebSocket-based with streaming chunks, tool call badges, thinking indicators
- **Connection status**: Cloud icon in Chat/More header shows live/offline state
- **Login**: Modal slide-up screen for entering server URL + API token

## User preferences

- Language: Vietnamese UI labels (`Chats` → "Chats", buttons in Vietnamese)
- Dark theme only (zinc-950 background, amber primary)
- No mock data shown when connected to real server

## Gotchas

- WS URL built as: `serverUrl.replace(/^http/, "ws") + "/v1/ws"`
- Connect params must include `protocolVersion: 3` or backend rejects auth
- `brain-outline` is not a valid Ionicons name — avoid it
- AsyncStorage key: `goclaw:auth` stores `{serverUrl, token, userId, senderID}`
- TypeScript: use `unknown as Record<...>` cast for colors (not direct `as`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- GoClaw Go backend source: `/tmp/agentclaw/` (WS protocol in `pkg/protocol/`)
