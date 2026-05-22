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
  - `app/` — expo-router screens (5 tabs + chat detail + login)
  - `app/(tabs)/` — Chat list, Agents grid, Dashboard, Monitor, More
  - `app/chat/[id].tsx` — Individual chat screen with WS messaging
  - `app/login.tsx` — Server URL + API token login screen
  - `context/AuthContext.tsx` — Auth state, AsyncStorage persistence, WS+HTTP client lifecycle
  - `context/AppContext.tsx` — Mock/demo data context (fallback when not connected)
  - `lib/api/protocol.ts` — WS method/event constants (mirrors Go backend)
  - `lib/api/ws-client.ts` — WebSocket JSON-RPC client (full auth + reconnect)
  - `lib/api/http-client.ts` — HTTP REST client with auth headers
  - `hooks/useAgents.ts` — Fetch agents via HTTP `/v1/agents`, fallback to WS `agents.list`
  - `hooks/useSessions.ts` — List sessions via WS `sessions.list`
  - `hooks/useMessages.ts` — Chat history + send via WS + streaming events
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
