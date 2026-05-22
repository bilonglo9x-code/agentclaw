# GoClaw — Master Spec: Kiến trúc, UI/UX & Feature Plan

> **Tài liệu tham chiếu duy nhất** cho repo GoClaw.  
> Merge từ: `spec.md` (kỹ thuật) + `agentclaw-spec.md` (UI/UX & feature plan).  
> Cập nhật: 2026-05-22

---

## Mục lục

1. [Tổng Quan Sản Phẩm](#1-tổng-quan-sản-phẩm)
2. [Kiến Trúc Tổng Thể](#2-kiến-trúc-tổng-thể)
3. [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4. [Database Schema](#4-database-schema-postgresql)
5. [Agent Pipeline v3](#5-agent-pipeline-v3)
6. [Memory System](#6-memory-system-chi-tiết)
7. [LLM Providers](#7-llm-providers)
8. [Tool Registry](#8-tool-registry-30-tools)
9. [WebSocket Protocol](#9-websocket-protocol-v3)
10. [HTTP REST API](#10-http-rest-api)
11. [Multi-Tenant & Security](#11-multi-tenant--security)
12. [Channels](#12-channels-7-kênh)
13. [Web Dashboard UI — Bản đồ tính năng](#13-web-dashboard-ui--bản-đồ-tính-năng)
14. [UI/UX Analysis & Pain Points](#14-uiux-analysis--pain-points)
15. [Desktop App (Lite)](#15-desktop-app-lite)
16. [Hệ thống phụ trợ](#16-hệ-thống-phụ-trợ)
17. [Build & Release](#17-build--release)
18. [Config & Env Vars](#18-config--env-vars)
19. [Observability](#19-observability)
20. [i18n](#20-i18n)
21. [Testing](#21-testing)
22. [Dual-DB Pattern](#22-dual-db-pattern-postgresql--sqlite)
23. [Key Patterns & Conventions](#23-key-patterns--conventions)
24. [Sơ Đồ Luồng Quan Trọng](#24-sơ-đồ-luồng-quan-trọng)
25. [Feature Development Plan](#25-feature-development-plan)
26. [UI/UX Redesign Spec](#26-uiux-redesign-spec)
27. [Prioritized Backlog](#27-prioritized-backlog)
28. [Technical Implementation Notes](#28-technical-implementation-notes)
29. [Trạng Thái Hiện Tại](#29-trạng-thái-hiện-tại)

---

## 1. Tổng Quan Sản Phẩm

**GoClaw** là một AI agent platform đa tenant, đa kênh, viết bằng Go.  
Hoạt động như một gateway thống nhất cho 20+ LLM providers, với bộ nhớ phân tầng, orchestration đa agent, và hỗ trợ 7 kênh nhắn tin.

### Hai phiên bản

| Tiêu chí | **Standard (Server)** | **Lite (Desktop)** |
|---|---|---|
| Database | PostgreSQL 18 + pgvector | SQLite (modernc.org/sqlite) |
| Build tag | (mặc định) | `sqliteonly` |
| Agents | Không giới hạn | Tối đa 5 |
| Teams | Không giới hạn | Tối đa 1 (5 thành viên) |
| Memory | pgvector semantic search | FTS5 text search |
| Channels | Telegram, Discord, Slack, Zalo, Feishu, WhatsApp | Không có |
| Knowledge Graph | Đầy đủ | Không có |
| RBAC / Multi-tenant | Đầy đủ | Không có |
| UI | Web SPA (React, port 18790) | Wails v2 desktop app |
| Binary | Docker / binary server | ~30 MB native app |
| Update | Docker pull / `goclaw update` | GitHub Releases tự động |

---

## 2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  Web SPA (React 19 + Vite)   Desktop App (Wails v2 + React)    │
│  Telegram / Discord / Slack / Zalo / Feishu / WhatsApp          │
│  OpenAI-compatible API clients                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                       GATEWAY LAYER                             │
│  WS Server (gorilla/websocket) + HTTP API (net/http)            │
│  Auth: Bearer token / API Key / Browser Pairing                 │
│  Rate limiting · CORS · SSRF protection · Prompt injection guard│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      AGENT PIPELINE (v3)                        │
│  Setup:     [ContextStage]                                      │
│  Iteration: [ThinkStage → PruneStage → ToolStage →              │
│              ObserveStage → CheckpointStage]                    │
│  Finalize:  [FinalizeStage]                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼────────────────────┐
         ▼                   ▼                    ▼
┌─────────────────┐ ┌──────────────────┐ ┌────────────────────┐
│  LLM PROVIDERS  │ │  TOOL REGISTRY   │ │  MEMORY SYSTEM     │
│  Anthropic      │ │  30+ built-in    │ │  Working (conv.)   │
│  OpenAI         │ │  Custom (DB)     │ │  Episodic (summary)│
│  OpenRouter     │ │  MCP bridge      │ │  Semantic (pgvec)  │
│  Groq / Gemini  │ │  Skill runner    │ │  Knowledge Graph   │
│  DeepSeek / xAI │ │  Sandbox (Docker)│ │  Knowledge Vault   │
│  Claude CLI     │ │  Web fetch/search│ └────────────────────┘
│  Codex / ACP    │ └──────────────────┘
│  DashScope / +8 │
└─────────────────┘
         │
┌────────▼────────────────────────────────────────────────────────┐
│                      STORE LAYER                                │
│  Interface-based (store.AgentStore, store.SessionStore, ...)    │
│  PostgreSQL impl (store/pg/) · SQLite impl (store/sqlitestore/) │
│  PostgreSQL 18 + pgvector · golang-migrate                      │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.26, Cobra CLI, gorilla/websocket, pgx/v5, golang-migrate |
| Web UI | React 19, Vite 6, TypeScript, Tailwind CSS 4, Radix UI, Zustand, React Router 7 |
| Desktop | Wails v2 + React (SQLite) |
| DB (server) | PostgreSQL 18 + pgvector |
| DB (desktop) | SQLite (modernc.org/sqlite) |
| Protocol | WebSocket RPC (req/res/event) + HTTP REST |
| i18n | en / vi / zh |

---

## 3. Cấu Trúc Thư Mục

```
goclaw/
├── cmd/                          CLI entry points
│   ├── root.go                   cobra root command
│   ├── gateway.go                gateway startup & lifecycle
│   ├── gateway_consumer.go       message consumption loop
│   ├── gateway_http_wiring.go    HTTP route registration
│   ├── gateway_tools_wiring.go   tool registry wiring
│   ├── gateway_providers.go      LLM provider init
│   ├── gateway_channels_setup.go channel instance boot
│   ├── onboard.go                interactive onboard wizard
│   ├── migrate.go                DB migration runner
│   ├── agent_chat.go             CLI chat command
│   ├── setup_*.go                provider/agent/channel setup
│   └── tui_*.go                  Bubble Tea TUI
│
├── internal/
│   ├── agent/                    Agent loop (v3 pipeline adapter)
│   ├── audio/                    TTS/STT multi-provider
│   ├── backup/                   S3 + local backup/restore
│   ├── bootstrap/                System context files + seeding
│   ├── bus/                      Internal event broadcast
│   ├── cache/                    LRU + Redis cache layer
│   ├── channels/                 Channel manager (7 channels)
│   ├── config/                   JSON5 config loading
│   ├── consolidation/            Memory consolidation workers
│   ├── crypto/                   AES-256-GCM encryption
│   ├── edition/                  Feature gating (Lite vs Standard)
│   ├── eventbus/                 Domain event bus (typed events)
│   ├── gateway/                  WS + HTTP server
│   │   └── methods/              RPC handlers per WS method
│   ├── hooks/                    Extensibility hook system
│   ├── http/                     HTTP route handlers
│   ├── i18n/                     Message catalog (en/vi/zh)
│   ├── knowledgegraph/           KG extractor + traversal
│   ├── mcp/                      MCP bridge (stdio/sse/http)
│   ├── memory/                   pgvector memory + auto-injector
│   ├── pipeline/                 8-stage pipeline orchestrator
│   ├── providers/                LLM provider adapters
│   ├── sandbox/                  Docker code sandbox
│   ├── scheduler/                Lane-based concurrency
│   ├── sessions/                 Session key management
│   ├── skills/                   SKILL.md loader + BM25 search
│   ├── store/                    Store interfaces + implementations
│   │   ├── base/                 Dialect abstraction, BuildMapUpdate
│   │   ├── pg/                   PostgreSQL implementations
│   │   └── sqlitestore/          SQLite implementations
│   ├── tokencount/               tiktoken BPE counting
│   ├── tools/                    Tool registry + all tool impls
│   ├── tracing/                  LLM call tracing + OTel export
│   ├── tts/                      Text-to-Speech adapters
│   ├── updater/                  Desktop auto-update checker
│   ├── vault/                    Knowledge Vault (wikilinks, FTS)
│   └── workspace/                WorkspaceContext resolver
│
├── pkg/
│   ├── protocol/                 Wire types (frames, methods, events)
│   └── browser/                  Browser automation (Rod + CDP)
│
├── migrations/                   PostgreSQL migration files (15+)
├── ui/
│   ├── web/                      React SPA (pnpm, Vite, Tailwind 4)
│   └── desktop/                  Wails v2 + SQLite desktop app
│       ├── main.go               Wails bindings
│       ├── app.go                embedded gateway
│       └── frontend/             React frontend for desktop
│
├── scripts/                      install-lite.sh, install-lite.ps1
├── docker/                       Dockerfile variants
├── docker-compose.yml            Full stack compose
├── Makefile                      build/test/release targets
├── main.go                       Binary entry point
├── go.mod                        Go 1.26 module
└── CLAUDE.md                     Dev guide (tech stack, patterns)
```

---

## 4. Database Schema (PostgreSQL)

### 4.1 LLM Providers (`llm_providers`)

| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK, uuid_v7 |
| `name` | VARCHAR(50) | Unique name |
| `display_name` | VARCHAR(255) | Tên hiển thị |
| `provider_type` | VARCHAR(30) | `openai_compat`, `anthropic`, `claude_cli`, `acp`, `codex`, `dashscope` |
| `api_base` | TEXT | Base URL |
| `api_key` | TEXT | Encrypted AES-256-GCM |
| `enabled` | BOOLEAN | Bật/tắt |
| `settings` | JSONB | Config mở rộng |

### 4.2 Agents (`agents`)

| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `agent_key` | VARCHAR(100) | Slug duy nhất (dùng trong log/path/UI) |
| `display_name` | VARCHAR(255) | |
| `owner_id` | VARCHAR(255) | User ID của chủ sở hữu |
| `provider` | VARCHAR(50) | Tên provider LLM |
| `model` | VARCHAR(200) | Model name |
| `context_window` | INT | Default 200,000 |
| `max_tool_iterations` | INT | Default 20 |
| `workspace` | TEXT | Đường dẫn workspace |
| `restrict_to_workspace` | BOOLEAN | Giới hạn file access |
| `tools_config` | JSONB | Tool policy config |
| `sandbox_config` | JSONB | Docker sandbox config |
| `subagents_config` | JSONB | Subagent spawn config |
| `memory_config` | JSONB | Memory behavior config |
| `compaction_config` | JSONB | History compaction settings |
| `context_pruning` | JSONB | Context pruning rules |
| `other_config` | JSONB | Misc config |
| `is_default` | BOOLEAN | Agent mặc định |
| `agent_type` | VARCHAR(20) | `open` hoặc `predefined` |
| `status` | VARCHAR(20) | `active`, `inactive` |
| `budget_monthly_cents` | INTEGER | Ngân sách tháng (USD cents) |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

**Agent types:**
- `open` — mỗi user có 7 context files riêng
- `predefined` — shared context + USER.md per-user

### 4.3 Context Files

| Table | Mô tả |
|---|---|
| `agent_context_files` | Files context cấp agent |
| `user_context_files` | Files context cấp user (per-user, per-agent) |
| `user_agent_profiles` | Workspace + last_seen per (agent, user) |
| `user_agent_overrides` | User override provider/model/settings |

### 4.4 Sessions (`sessions`)

| Column | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `session_key` | VARCHAR(500) | Unique key (routing) |
| `agent_id` | UUID | FK agents |
| `user_id` | VARCHAR(255) | External user |
| `messages` | JSONB | Conversation history |
| `summary` | TEXT | Compacted summary |
| `model`, `provider` | VARCHAR | Model used |
| `channel` | VARCHAR(50) | Source channel |
| `input_tokens`, `output_tokens` | BIGINT | Token accounting |
| `compaction_count` | INT | History compaction counter |
| `label` | VARCHAR(500) | User-assigned label |
| `spawned_by` | VARCHAR(200) | Parent agent key (subagent) |
| `spawn_depth` | INT | Nesting depth |

### 4.5 Memory System (3-tier)

#### Working Memory — `sessions.messages` (JSONB)
Lịch sử hội thoại trực tiếp trong session.

#### Episodic Memory — `memory_documents` + `memory_chunks`

```sql
memory_documents   -- Document registry (path + hash)
memory_chunks      -- text chunks với embedding vector(1536)
                   -- + tsvector cho FTS (BM25)
                   -- Indexed: HNSW cosine + GIN tsvector
embedding_cache    -- Cache embedding by (hash, provider, model)
```

#### Semantic Memory — Knowledge Graph

```sql
kg_entities   -- (agent_id, user_id, external_id, name, entity_type, confidence)
kg_relations  -- (source → relation_type → target, confidence)
```

### 4.6 Skills

```sql
skills              -- (slug, visibility, version, embedding vector(1536), tags TEXT[], file_path)
skill_agent_grants  -- (skill_id, agent_id, pinned_version)
skill_user_grants   -- (skill_id, user_id)
```

### 4.7 Cron Jobs

```sql
cron_jobs      -- (schedule_kind: cron|every|at, expression, agent_id, enabled)
cron_run_logs  -- run history per job
```

### 4.8 Agent Teams & Orchestration

```sql
agent_teams          -- (name, lead_agent_id, status, settings)
agent_team_members   -- (team_id, agent_id, role)
team_tasks           -- (subject, description, status, owner_agent_id, blocked_by[], priority, result)
                     -- status: pending | in_progress | done | failed
                     -- + tsvector FTS
team_messages        -- peer-to-peer mailbox (from_agent_id → to_agent_id)
delegation_history   -- mỗi lần delegate được persist
agent_links          -- link 2 agent để cho phép delegate
handoff_routes       -- route handoff theo (channel, chat_id)
```

### 4.9 Channels & Contacts

```sql
channel_instances    -- (name, channel_type, agent_id, credentials BYTEA, config JSONB)
                     -- channel_type: telegram|discord|slack|zalo|feishu|whatsapp
channel_contacts     -- auto-collected user info từ tất cả channels
paired_devices       -- kết quả pairing (sender_id, channel, chat_id)
pairing_requests     -- QR/code pairing requests (expires_at)
```

### 4.10 Tools & MCP

```sql
custom_tools        -- (name, description, parameters JSONB, command, env BYTEA encrypted)
mcp_servers         -- (transport: stdio|sse|streamable-http, command|url, api_key encrypted)
mcp_agent_grants    -- (server_id, agent_id, tool_allow[], tool_deny[])
mcp_user_grants     -- (server_id, user_id)
mcp_access_requests -- approval workflow (pending|approved|rejected)
builtin_tools       -- registry bật/tắt built-in tools per tenant
```

### 4.11 LLM Tracing

```sql
traces  -- (agent_id, session_key, run_id, total_input/output_tokens, total_cost, status, tags[])
spans   -- (trace_id, span_type: llm|tool|agent, model, input/output_tokens, tool_name, cost)
```

### 4.12 Các bảng khác

```sql
api_keys            -- Gateway API keys (prefix, scopes[], expires_at)
config_secrets      -- Encrypted key-value secrets
activity_logs       -- Audit log (actor, action, entity, ip)
vault_documents     -- Knowledge Vault documents (wikilinks, FTS+semantic)
vault_graph_*       -- Vault link graph
episodic_memories   -- Session summaries (episodic tier)
```

---

## 5. Agent Pipeline v3

### 5.1 Cấu Trúc Pipeline

```
NewDefaultPipeline():
  Setup:     [ContextStage]
  Iteration: [ThinkStage → PruneStage → ToolStage → ObserveStage → CheckpointStage]
  Finalize:  [FinalizeStage]
```

| Stage | Vai trò |
|---|---|
| **ContextStage** | Load agent config, user profile, workspace, context files vào RunState |
| **ThinkStage** | Gọi LLM provider → nhận tool calls hoặc final content |
| **PruneStage** | Cắt bớt history nếu vượt context window, trigger MemoryFlushStage |
| **ToolStage** | Thực thi tool calls song song, collect kết quả |
| **ObserveStage** | Capture final content, cập nhật token counts |
| **CheckpointStage** | Persist state vào DB |
| **FinalizeStage** | Memory flush, episodic summarization, event emission |

### 5.2 Luồng Exit

| Signal | Hành vi |
|---|---|
| `BreakLoop` | Hoàn thành iteration hiện tại rồi thoát |
| `AbortRun` | Thoát inner loop ngay lập tức (unrecoverable) |

### 5.3 Prompt System (4 modes)

| Mode | Mô tả |
|---|---|
| `Full` | Đầy đủ tất cả sections |
| `Task` | Sections liên quan đến task hiện tại |
| `Minimal` | Chỉ identity + tool list |
| `None` | Không có system prompt |

---

## 6. Memory System Chi Tiết

### 6.1 3-Tier Architecture

```
Working Memory    ← session.messages (JSONB, in RAM during run)
     ↓ (khi session kết thúc)
Episodic Memory   ← session summaries → episodic_memories table
     ↓ (dreaming consolidation worker)
Semantic Memory   ← knowledge graph (kg_entities, kg_relations)
                    + memory_chunks (pgvector HNSW)
```

### 6.2 Progressive Loading (L0/L1/L2)

| Level | Nội dung | Trigger |
|---|---|---|
| L0 | Auto-inject vào mọi prompt | Luôn luôn |
| L1 | Relevant chunks từ episodic + semantic | Query khi cần |
| L2 | Full document retrieval | Explicit request |

### 6.3 Consolidation Workers

| Worker | Trigger | Hành động |
|---|---|---|
| `episodic_worker` | Sau mỗi session | Tóm tắt session → episodic_memories |
| `semantic_worker` | Đủ episodic memories | Extract entities → KG |
| `dreaming_worker` | Theo schedule | Promote episodic → semantic |

---

## 7. LLM Providers

| Provider | Adapter | Đặc điểm |
|---|---|---|
| Anthropic | `adapter_anthropic.go` | Native HTTP+SSE, prompt caching, extended thinking |
| OpenAI | `adapter_openai.go` | OpenAI-compatible HTTP+SSE |
| Claude CLI | `claude_cli*.go` | Stdio + MCP bridge, session management |
| ACP | `acp_provider.go` | Anthropic Console Proxy |
| Codex | `codex*.go` | OpenAI Codex, native image support |
| DashScope | `adapter_dashscope.go` | Alibaba Qwen |
| OpenRouter | (openai_compat) | Multi-model routing |
| Groq, Gemini, Mistral, xAI, MiniMax, DeepSeek | (openai_compat) | OpenAI-compatible endpoints |

**Shared infrastructure:**
- `SSEScanner` — dùng chung cho tất cả streaming providers
- `RetryDo()` — retry với exponential backoff
- `ModelRegistry` — forward-compat resolver (alias models)
- `ProviderAdapter` — pluggable interface
- Capability system: image gen, reasoning, embeddings, thinking per-provider

---

## 8. Tool Registry (30+ tools)

| Category | Tools |
|---|---|
| **Filesystem** | `read_file`, `write_file`, `edit_file`, `list_files`, `search`, `glob` |
| **Runtime** | `exec` (với approval workflow), `browser` (Rod + CDP) |
| **Web** | `web_search` (Brave/DuckDuckGo/Exa/Tavily), `web_fetch` |
| **Memory** | `memory_search`, `memory_get`, `knowledge_graph_search` |
| **Media** | `create_image`, `create_audio`, `create_video`, `read_*`, `tts` |
| **Skills** | `skill_search`, `use_skill`, `skill_manage` |
| **Teams** | `team_tasks`, `spawn`, `delegate`, `message` |
| **Automation** | `cron`, `heartbeat`, `sessions_*` |

**Security:**
- Shell deny groups — blacklist pattern groups
- SSRF protection — block internal IPs
- Path traversal prevention
- Tool call prefix stripping
- Sandbox — Docker container isolation cho untrusted code
- Exec approval workflow — admin phải approve trước khi chạy

---

## 9. WebSocket Protocol v3

### 9.1 Frame Types

```json
// Request (client → server)
{"type": "req", "id": "req-1", "method": "chat.send", "params": {...}}

// Response (server → client)
{"type": "res", "id": "req-1", "ok": true, "payload": {...}}
{"type": "res", "id": "req-1", "ok": false, "error": {"code": "...", "message": "..."}}

// Event (server push)
{"type": "event", "event": "chunk", "payload": {"content": "text..."}}
```

### 9.2 Authentication (3 paths)

```json
// Path 1: Token admin
{"type":"req","id":1,"method":"connect","params":{"token":"...","user_id":"alice"}}

// Path 2: Browser pairing reconnect
{"type":"req","id":1,"method":"connect","params":{"sender_id":"...","user_id":"alice"}}

// Path 3: No token → initiate pairing flow
{"type":"req","id":1,"method":"connect","params":{"user_id":"alice"}}
```

### 9.3 Methods

| Method | Mô tả |
|---|---|
| `connect` | Auth handshake (bắt buộc đầu tiên) |
| `chat.send` | Gửi message đến agent |
| `chat.history` | Lấy lịch sử session |
| `chat.abort` | Dừng agent đang chạy |
| `agent` | Thông tin agent |
| `sessions.list`, `sessions.delete`, `sessions.label` | Quản lý session |
| `skills.list` | Danh sách skills |
| `cron.list/create/delete/toggle` | Quản lý cron jobs |
| `models.list` | Danh sách AI models |
| `device.pair.*` | Pairing management |

### 9.4 Server Push Events

| Event | Payload |
|---|---|
| `chunk` | `{content: string}` — streaming token |
| `tool.call` | `{name, id}` — agent gọi tool |
| `tool.result` | Kết quả tool execution |
| `run.started` | Agent bắt đầu |
| `run.completed` | Agent xong |
| `shutdown` | Server đóng |

---

## 10. HTTP REST API

**Base URL:** `/`  
**Auth:** `Authorization: Bearer <token-or-api-key>`  
**Multi-tenant headers:**
- `X-GoClaw-User-Id` — external user ID
- `X-GoClaw-Agent-Id` — target agent
- `X-GoClaw-Tenant-Id` — tenant scope (UUID hoặc slug)
- `Accept-Language` — locale (`en`, `vi`, `zh`)

### 10.1 API Endpoints

| Tag | Endpoints |
|---|---|
| **Chat** | `POST /v1/chat/completions` — OpenAI-compatible |
| **API Keys** | `GET/POST /v1/api-keys`, `DELETE /v1/api-keys/:id` |
| **Agents** | CRUD `/v1/agents`, shares, context files, workspace, prompt preview |
| **Sessions** | List, delete, label, history |
| **Providers** | CRUD `/v1/providers`, model list, verify, embedding verify |
| **Skills** | CRUD, grants, import/export, versions |
| **MCP Servers** | CRUD, grants, tools list, requests approval |
| **Custom Tools** | CRUD, invoke |
| **Built-in Tools** | List, enable/disable, settings |
| **Memory** | List, delete, flush |
| **Knowledge Graph** | Entities, relations, search |
| **Channels** | CRUD channel instances |
| **Traces** | List traces, spans, LLM call details |
| **Usage** | Token usage analytics |
| **Activity** | Audit log |
| **Storage** | Workspace file manager |
| **Media** | Upload, serve |
| **Teams** | CRUD teams, members, tasks, messages |
| **Vault** | Documents, wikilinks, search, upload |
| **TTS** | Config, test connection, voices |
| **Packages** | Skill dependency management |
| **System** | `GET /health` |

### 10.2 API Key Scopes

| Scope | Quyền |
|---|---|
| `operator.admin` | Full admin |
| `operator.read` | Read-only |
| `operator.write` | Read + write |
| `operator.approvals` | Manage exec approvals |
| `operator.pairing` | Device pairing |

---

## 11. Multi-Tenant & Security

### 11.1 Tenant Isolation

- Mỗi tenant có `tenant_id` riêng (UUID hoặc slug)
- Tất cả queries phải filter theo `tenant_id` (tenant-scoped tables)
- Global tables (không có tenant_id): `builtin_tools`, disk config → phải dùng `requireMasterScope`

### 11.2 RBAC (5-layer)

1. Gateway token (master scope)
2. API key scopes (`operator.*`)
3. Agent role (`admin`, `operator`, `viewer`)
4. Agent share role (`user`, `admin`)
5. Tool policy per-agent (tool_allow/tool_deny)

### 11.3 Security Stack

- Rate limiting (per-user, per-agent)
- Input guard (prompt injection detection, detection-only)
- AES-256-GCM encryption (API keys, MCP credentials, channel credentials, custom tool env)
- SSRF protection
- Path traversal prevention
- Shell deny patterns + deny groups
- Execution approval workflow

---

## 12. Channels (7 kênh)

| Channel | Package | Ghi chú |
|---|---|---|
| Telegram | `mymmrac/telego` | Bot API + Forum topics |
| Discord | `bwmarrin/discordgo` | |
| Slack | `slack-go/slack` | |
| Zalo OA | internal | Zalo Official Account |
| Zalo Personal | internal | |
| Feishu/Lark | internal | |
| WhatsApp | `go.mau.fi/whatsmeow` | Native (không qua API cloud) |

### Channel Pipeline

```
Channel message → sanitize display name → rate limit check
    → routing metadata → history flush
    → dispatch to agent consumer
    → agent produces content
    → SanitizeAssistantContent() → markdownToTelegramHTML() (for Telegram)
    → chunkHTML() → sendHTML()
```

---

## 13. Web Dashboard UI — Bản đồ tính năng

### 13.1 Stack

- React 19 + Vite 6 + TypeScript
- Tailwind CSS 4 + Radix UI
- Zustand state management
- React Router 7

### 13.2 Navigation Structure (Sidebar)

```
CORE
  ├── /overview      Dashboard (metrics, health, usage analytics)
  ├── /chat          Chat UI với agent
  ├── /agents        Agent management
  └── /teams         Agent Teams + Kanban

CONVERSATIONS
  ├── /sessions          Session manager
  ├── /pending-messages  Inbox messages cần xử lý
  └── /contacts          Channel contacts

CONNECTIVITY
  ├── /channels   Channel instances (Telegram, Discord, Slack, Zalo, Feishu, WhatsApp)
  └── /nodes      Device pairing (QR/code)

CAPABILITIES
  ├── /skills        Skills library + grants
  ├── /builtin-tools Built-in tool settings (30+ tools)
  ├── /mcp           MCP server config + grants
  ├── /tts           TTS config + voice list (owner only)
  ├── /cron          Cron job manager
  └── /hooks         Hook configuration

DATA
  ├── /memory          Memory viewer (Working + Episodic)
  ├── /vault           Knowledge Vault documents
  ├── /knowledge-graph KG entities + relations viewer
  └── /storage         Workspace file browser

MONITORING
  ├── /traces   LLM call tracing
  ├── /events   Real-time event stream
  ├── /activity Audit log
  └── /logs     Server logs

SYSTEM (Admin only)
  ├── /tenants-admin   Multi-tenant admin (owner only)
  ├── /providers       LLM provider config
  ├── /cli-credentials CLI credential management
  ├── /api-keys        API key management
  ├── /packages        Skill dependencies
  ├── /config          System config (owner only)
  ├── /approvals       Exec approval workflow
  ├── /import-export   Import/export data
  └── /backup-restore  Backup/restore (owner only)
```

### 13.3 Chi tiết từng trang chính

#### `/overview` — Dashboard
- Stat cards: Uptime, Agents, Providers, Total cost, Requests
- Tabs: Dashboard | Usage Analytics
- Usage: Token area chart, Request volume, Duration chart, Knowledge chart, Top Models table, Provider/Model/Channel distribution donuts
- System health card, Connected clients, Cron jobs, Recent requests, Quota usage, Channel instances
- Auto-refresh mỗi 30s

#### `/chat` — Chat Interface
- Sidebar trái: session list theo agent
- Thread giữa: messages với streaming, thinking text, tool call stream
- Input dưới: gửi tin, đính kèm file (drag-drop), media
- Agent picker khi chưa chọn
- Task panel bên phải (team tasks liên quan session)
- Virtual keyboard handling trên mobile

#### `/agents` — Agent Management
- View: Card / List toggle
- Filter: by owner, by type (open/predefined)
- Search, Pagination
- Create dialog: wizard tạo agent
- Detail page tabs: Overview, Context files, Tools config, Memory, Sandbox, Subagents, Evolution, Compaction, Context pruning, Sharing & access
- Summoning modal (start/stop)

#### `/teams` — Agent Teams
- Tabs: Teams | Links
- Team detail:
  - **Board tab**: Kanban board với drag-drop
  - **Members tab**: add/remove agents + permissions
  - **Settings tab**: orchestration mode (auto/explicit/manual), notifications, access control, workspace
  - **Links tab**: inter-agent delegation links
- Audit logs modal, Features modal

#### `/vault` — Knowledge Vault
- Tree view (VaultTree) + Document sidebar
- Filters: by agent, by team, by doc type
- Create document, hybrid search dialog (BM25 + semantic)
- Graph view (lazy load) — wikilink connections visualization
- Filesystem sync (rescan workspace), Enrichment progress

#### `/knowledge-graph` — Knowledge Graph
- Filter by agent, by user
- Entities tab với stats
- Embedding status check
- (Hiện chỉ có entity list — thiếu graph visualization)

#### `/traces` — LLM Tracing
- List + Detail dialog
- Span tree node rendering
- (Hiện chưa có waterfall chart)

#### `/providers` — LLM Providers
- List với status, enable/disable
- Detail: overview, embedding, reasoning, pool activity, OAuth
- Pool setup wizard

#### `/memory` — Memory Management
- Tabs: Working Memory documents | Episodic Memory
- Search dialog, Create dialog, Table view
- Embedding status indicator

### 13.4 Zustand Stores

| Store | Nội dung |
|---|---|
| `use-auth-store` | Auth state, user info, token, role, connected |
| `use-chat-messages-store` | Chat messages, streaming state |
| `use-ui-store` | UI preferences, sidebar, pageSize, timezone |
| `use-toast-store` | Toast notifications |
| `use-logs-store` | Log viewer state |
| `use-kg-detail-store` | KG detail panel state |
| `use-team-event-store` | Real-time team events |

### 13.5 Mobile UI Rules (từ CLAUDE.md)

- Dùng `h-dvh` thay `h-screen`
- Input font-size tối thiểu 16px (tránh iOS auto-zoom)
- Safe area insets cho notched devices (`safe-top`, `safe-bottom`, etc.)
- Touch targets ≥ 44px (`@media (pointer: coarse)` + `::after` pseudo)
- Tables wrap trong `overflow-x-auto`
- `useVirtualKeyboard()` hook cho chat input
- `overscroll-contain` trên scrollable areas
- `ErrorBoundary` với `stableErrorBoundaryKey(pathname)` — không dùng `key={location.pathname}`

---

## 14. UI/UX Analysis & Pain Points

### 14.1 Điểm mạnh hiện tại

- Component library nhất quán: Radix UI + Tailwind CSS 4
- Mobile-first conventions được ghi chép rõ (CLAUDE.md Mobile UI Rules)
- WebSocket-first: real-time updates qua events, ít polling
- Role-based nav: admin-only sections ẩn với viewer
- Error boundaries per-route với stable key
- i18n đủ 3 ngôn ngữ

### 14.2 Pain Points (ưu tiên giảm dần)

| # | Vấn đề | Mức độ | Trang |
|---|--------|--------|-------|
| P1 | **Agent Detail flat layout**: Tất cả config sections đổ xuống 1 page phẳng → cognitive overload | Critical | `/agents/:id` |
| P2 | **Navigation overload**: 30+ sidebar items không có grouping ưu tiên hay favorites | High | Sidebar |
| P3 | **Chat thiếu table-stakes**: No search in history, no session preview text, no bookmarks | High | `/chat` |
| P4 | **Knowledge Graph chỉ entity list**: Thiếu graph visualization thực sự (force-directed) | High | `/knowledge-graph` |
| P5 | **Dashboard không actionable**: Hiển thị số liệu nhưng không guide user làm gì tiếp | High | `/overview` |
| P6 | **Vault graph chậm**: Không feedback khi load graph lớn | High | `/vault` |
| P7 | **Traces thiếu waterfall**: Span tree khó đọc, không có latency axis | Medium | `/traces` |
| P8 | **Providers không có quick-compare**: Phải vào từng provider để xem detail | Medium | `/providers` |
| P9 | **Skills file viewer không syntax-highlight** | Medium | `/skills` |
| P10 | **Approvals thiếu bulk actions + timeout display** | Medium | `/approvals` |
| P11 | **Logs thiếu filter/search/level** | Medium | `/logs` |
| P12 | **Cron không có visual expression builder** | Low | `/cron` |
| P13 | **Storage thiếu file browser UI** | Low | `/storage` |

### 14.3 UX Gaps theo User Journey

#### Journey 1: First-time setup
- Setup wizard: ✅ (step-provider → step-model → step-agent → step-channel)
- **Gap**: Sau wizard không có onboarding checklist / guided next steps

#### Journey 2: Daily chat
- **Gap**: Không có "recent agents" quick-pick; session list không có preview text; không search history

#### Journey 3: Monitor agent performance
- **Gap**: Không có alert khi error rate tăng; traces thiếu waterfall view; không export trace

#### Journey 4: Build agent team
- **Gap**: Kanban thiếu filter by assignee/priority; team settings rải rác trong nhiều modal

---

## 15. Desktop App (Lite)

### 15.1 Stack

- Wails v2 (Go backend + React frontend)
- Build tag: `//go:build sqliteonly`
- SQLite via `modernc.org/sqlite`
- OS Keyring (`go-keyring`) cho secrets

### 15.2 Paths

| Mục đích | Path |
|---|---|
| Data (SQLite) | `~/.goclaw/data/` |
| Config | `~/.goclaw/` |
| Workspace | `~/.goclaw/workspace/` |
| Secrets fallback | `~/.goclaw/secrets/` |
| Port | 18790 (localhost) |

### 15.3 Giới hạn Lite

- Max 5 agents, 1 team, 5 members, 50 sessions
- Không có: channels, heartbeat, file storage UI, skill self-manage, KG, RBAC, multi-tenant
- Tool gating qua `TeamActionPolicy`: không có comment/review/approve/reject/attach/ask_user
- `skill_manage`/`publish_skill` không được đăng ký

---

## 16. Hệ Thống Phụ Trợ

### 16.1 Self-Evolution System

```
Metrics Collection → Suggestion Analysis → Auto-Adapt (với guardrails)
```

| Stage | Mô tả |
|---|---|
| Metrics | Thu thập performance metrics trong sessions |
| Suggestion | LLM phân tích → gợi ý cải thiện |
| Adapt | Apply changes với rollback guard |

**Guardrails (không được thay đổi):** Identity, name, core purpose của agent.  
**Có thể thay đổi:** communication style, domain expertise (CAPABILITIES.md).

### 16.2 Knowledge Vault

- Document registry với `[[wikilinks]]` bidirectional
- Hybrid search: FTS (BM25) + pgvector semantic
- Filesystem sync (watch + rescan)
- Wikilink graph (`vault_graph_*`)
- Upload endpoint + media summary

---

## 17. Build & Release

### 17.1 Build Commands

```bash
# Standard server
go build -o goclaw .
./goclaw onboard       # Interactive setup
source .env.local && ./goclaw

# DB migrations
./goclaw migrate up

# Desktop
make desktop-build VERSION=0.1.0   # .app / .exe
make desktop-dmg VERSION=0.1.0     # .dmg (macOS)
make desktop-dev                   # Hot reload dev mode

# Web UI
cd ui/web && pnpm install && pnpm dev

# Docker
make up                            # Start full stack
make up WITH_BROWSER=1 WITH_OTEL=1 # Optional services
```

### 17.2 Docker Images

| Tag | Nội dung |
|---|---|
| `latest` | Backend + Web UI + Python |
| `base` | Backend only |
| `full` | All runtimes + skill deps |
| `web` | Standalone Nginx + React SPA |
| `beta` | Beta builds |

Registry: `ghcr.io/nextlevelbuilder/goclaw` + `digitop/goclaw`

### 17.3 CI/CD Workflows

| Workflow | Trigger | Mục đích |
|---|---|---|
| `ci.yaml` | push main, PR → main/dev | Go build + test + vet + Web build |
| `release.yaml` | tag `v[0-9]+.[0-9]+.[0-9]+` | Binaries + Docker + Discord notify |
| `release-beta.yaml` | tag `v*-beta*` / `v*-rc*` | Beta release |
| `release-desktop.yaml` | tag `lite-v*` | Desktop macOS + Windows |

---

## 18. Config & Env Vars

- Format: **JSON5** (via `titanous/json5`)
- Path: env var `GOCLAW_CONFIG`
- Secrets: `.env.local` hoặc env vars (không bao giờ trong config.json)
- Hot reload: `fsnotify` watch trên config file
- Auto-onboard: khi `GOCLAW_*_API_KEY` env vars được set → tự onboard không cần interactive

| Var | Mô tả |
|---|---|
| `GOCLAW_CONFIG` | Path to JSON5 config |
| `GOCLAW_PORT` | Port (default 18790) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOCLAW_*_API_KEY` | Auto-onboard provider key |

---

## 19. Observability

### 19.1 Logging

- `rs/zerolog` structured logging
- **Không dùng `console.log`** trong server code
- Dùng `req.log` trong route handlers, `logger` singleton cho non-request code
- Security events: `slog.Warn("security.*")`

### 19.2 Tracing

- Built-in LLM call tracing (traces + spans tables)
- Optional OpenTelemetry OTLP export (build tag `otel`)
- Jaeger UI support (`WITH_OTEL=1` Docker flag)
- Span types: `llm`, `tool`, `agent`
- Prompt cache hit tracking cho Anthropic + OpenAI

---

## 20. i18n

### 20.1 Backend

- Package: `internal/i18n`
- `i18n.T(locale, key, args...)` — main function
- Keys: `internal/i18n/keys.go`
- Catalogs: `catalog_en.go`, `catalog_vi.go`, `catalog_zh.go`
- Locale propagation: `store.WithLocale(ctx)`

### 20.2 Frontend

- `i18next` với namespace-split locale files
- Path: `ui/web/src/i18n/locales/{en,vi,zh}/`

### 20.3 Quy tắc thêm string mới

1. Thêm key vào `internal/i18n/keys.go`
2. Thêm translations vào **CẢ 3** catalog files (en/vi/zh)
3. Thêm UI strings vào **CẢ 3** locale dirs
4. Bootstrap templates (SOUL.md, IDENTITY.md) giữ nguyên tiếng Anh

---

## 21. Testing

```bash
# Unit tests
go test ./...

# Integration tests (cần PostgreSQL 18 + pgvector trên port 5433)
docker run -d --name pgtest -p 5433:5432 \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=goclaw_test \
  pgvector/pgvector:pg18

TEST_DATABASE_URL="postgres://postgres:test@localhost:5433/goclaw_test?sslmode=disable" \
  go test -v -tags integration ./tests/integration/

# Layered test suites
make test-invariants   # P0 - tenant isolation (blocking)
make test-contracts    # P1 - API schemas (cần server đang chạy)
make test-scenarios    # P2 - user journeys (cần server đang chạy)
make test-critical     # P0 + P1 (pre-merge)
```

---

## 22. Dual-DB Pattern (PostgreSQL + SQLite)

Khi thêm schema change phải cập nhật **CẢ HAI**:

| Database | Nơi thêm |
|---|---|
| PostgreSQL | `migrations/XXXXXX_*.up.sql` + bump `RequiredSchemaVersion` trong `internal/upgrade/version.go` |
| SQLite | `internal/store/sqlitestore/schema.sql` (fresh schema) + incremental patch trong `schema.go migrations` map + bump `SchemaVersion` constant |

> **Lý do:** Missing SQLite migration → desktop edition crash on startup.

---

## 23. Key Patterns & Conventions

### 23.1 Store Layer

```go
// Interface-based
type AgentStore interface {
    GetAgent(ctx, id) (*Agent, error)
    // ...
}

// Context propagation
ctx = store.WithAgentType(ctx, agentType)
ctx = store.WithUserID(ctx, userID)
ctx = store.WithTenantID(ctx, tenantID)
ctx = store.WithLocale(ctx, "vi")

// Query helpers
BuildMapUpdate(map[string]any{...})   // dynamic SET clause
BuildScopeClause(ctx)                 // tenant WHERE clause
```

### 23.2 Agent Identity (Dual-Identity)

| Loại | Dùng cho |
|---|---|
| `agent_key` (slug) | Logs, file paths, UI display |
| `id` (UUID) | DB foreign keys, events, API responses |

### 23.3 Tenant-Scope Guards

```go
// Global table writes (không có tenant_id)
http.requireMasterScope(...)

// Tenant-scoped table writes
http.requireTenantAdmin(...) + SQL WHERE tenant_id = $N
```

### 23.4 SQL Safety

- Luôn dùng parameterized queries (`$1, $2, ...` cho PG, `?` cho SQLite)
- Không string concatenation trong SQL
- Kiểm tra N+1 queries
- Verify index coverage trước khi thêm WHERE/JOIN

---

## 24. Sơ Đồ Luồng Quan Trọng

### 24.1 Chat Message Flow (WebSocket)

```
Client                     Gateway                    Agent Pipeline
  │                           │                            │
  │── chat.send {msg} ──────► │                            │
  │                           │── schedule ──────────────► │
  │◄── event:run.started ─── │                            │
  │                           │                    ContextStage
  │                           │                    ThinkStage (LLM call)
  │◄── event:chunk ───────── │◄── streaming ──────────── │
  │◄── event:chunk ───────── │                            │
  │                           │                    ToolStage (if tools)
  │◄── event:tool.call ────── │                            │
  │◄── event:tool.result ──── │                            │
  │                           │                    ObserveStage
  │                           │                    CheckpointStage
  │                           │                    FinalizeStage
  │◄── event:run.completed ── │◄── done ──────────────── │
  │◄── res {ok:true} ──────── │                            │
```

### 24.2 Agent Delegation Flow

```
Lead Agent                 Target Agent           DB
    │                          │                   │
    │── delegate tool ─────────►│                  │
    │   (sync|async|bidirectional)                 │
    │                          │── run pipeline ── │
    │                          │◄── result ─────── │
    │                          │── insert delegation_history
    │◄── result ────────────── │                   │
```

### 24.3 Memory Consolidation Flow

```
Session ends
    │
    ▼
DomainEventBus: SessionCompleted
    │
    ├──► episodic_worker
    │       → summarize session → insert episodic_memories
    │
    └──► (after N episodic entries)
         dreaming_worker
             → scoring → promote to semantic
             → kg extractor → kg_entities + kg_relations
```

---

## 25. Feature Development Plan

### Phase 1 — UX Foundation: Quick Wins (2-3 tuần)

#### F1.1 Sidebar Redesign — Favorites + Collapsed Groups
- Cho phép user pin/favorite nav items → hiện ở top
- Nhóm items ít dùng vào "More..." expandable section
- Badge số lượng trên items (pending approvals, unread messages)
- **Files cần sửa:** `sidebar.tsx`, `sidebar-group.tsx`, `sidebar-item.tsx`, thêm Zustand store `use-favorites-store`

#### F1.2 Agent Detail — Tabbed Layout
- Thay layout phẳng bằng Tabs: **Overview | Context | Tools | Memory | Advanced**
- Overview: card summary, quick stats, recent activity
- Context: context files editor
- Tools: tool policy + builtin toggle + MCP grants
- Memory: compaction, pruning, episodic config
- Advanced: sandbox, subagents, evolution
- **Files cần sửa:** `agent-detail-page.tsx` và tất cả section files

#### F1.3 Chat Enhancements
- **Session search**: full-text search trong session list
- **Session labels/tags**: đặt tên/nhóm sessions
- **Session preview**: hiện last message text trong sidebar list
- **Message bookmark**: star/save messages quan trọng
- **Copy message**: one-click copy assistant output
- **Files cần sửa:** `chat-page.tsx`, `chat-sidebar.tsx`, `chat-thread.tsx`

#### F1.4 Logs Page — Filter & Search
- Log level filter: DEBUG / INFO / WARN / ERROR
- Full-text search trong logs
- Time range picker
- Auto-scroll toggle + Export logs
- **Files cần sửa:** `logs-page.tsx`

#### F1.5 Approvals — Bulk Actions & Timeout
- Checkbox multi-select → bulk approve/reject
- Countdown timer mỗi approval request
- Filter by agent, by tool category
- **Files cần sửa:** `approvals-page.tsx`

#### F1.6 Onboarding Flow (mới)
- Sau setup wizard: welcome screen với checklist tiến trình
- Steps: Create agent → Connect channel → Send first message
- Persistent progress, dismiss khi hoàn thành
- **Files mới:** `onboarding/` directory, `use-onboarding-store`

---

### Phase 2 — Core Feature Upgrades (3-4 tuần)

#### F2.1 Knowledge Graph Visualization
- Force-directed graph (D3.js hoặc `react-force-graph-2d`)
- Node types với màu khác nhau: person / concept / event / place
- Edge labels: relationship type
- Click node → entity detail panel
- Zoom/pan, filter by type, search với highlight
- **Files mới:** `knowledge-graph-page.tsx` → thêm `kg-graph-view.tsx`
- **Deps cần thêm:** `react-force-graph-2d`

#### F2.2 Traces — Waterfall View
- Span waterfall chart (gantt-style): trục X là time, mỗi span là 1 row
- Color coding: LLM call / tool call / agent / memory
- Error spans highlighted đỏ
- Hover tooltip: duration, status, token count
- Export trace as JSON
- Filter: by status (success/error/timeout), by agent, by provider, by time range
- **Files cần sửa:** `trace-detail-dialog.tsx` → thêm `trace-waterfall.tsx`

#### F2.3 Dashboard 2.0
- **Actionable cards**: mỗi metric card có "View →" hoặc quick action
- **Agent health grid**: mini status card cho từng agent
- **Recent activity feed**: merged events từ sessions, cron, channels
- **Cost sparkline**: trend 7 ngày
- **Tách Usage ra route `/usage` riêng** trong sidebar (dưới Monitoring)
- **Files cần sửa:** `overview-page.tsx`, thêm `agent-health-grid.tsx`, `activity-feed.tsx`

#### F2.4 Provider Comparison
- Provider list có thêm cột: avg latency (30 days), cost/1K tokens
- "Compare" mode: chọn 2-3 providers → side-by-side comparison table
- Quick test từ list view: gửi prompt test, xem response time + cost
- **Files cần sửa:** `providers-page.tsx`, `provider-list-row.tsx`
- **Files mới:** `provider-compare-dialog.tsx`

#### F2.5 Skills Viewer — Syntax Highlight
- Tích hợp `shiki` cho file viewer trong Skills
- Support: Go, Python, TypeScript, JSON, YAML, Markdown, Shell
- Copy button, line numbers
- **Files cần sửa:** `skill-file-viewers.tsx`
- **Deps cần thêm:** `shiki`

#### F2.6 Global Command Palette (Cmd+K)
- Search agents, sessions, vault docs, skills
- Quick actions: "New chat with [agent]", "Create agent", "Run cron job"
- Recent items history
- **Files mới:** `command-palette.tsx`, `use-command-store`
- **Deps cần thêm:** `cmdk`

---

### Phase 3 — Advanced Features (4-6 tuần)

#### F3.1 Agent Builder — Visual Wizard
- Multi-step wizard thay create dialog:
  1. Identity (name, description, personality)
  2. Capabilities (tools, skills, MCP)
  3. Memory (memory mode, vault, KG)
  4. Channels (liên kết)
  5. Review & Launch với system prompt preview
- Template gallery: coding assistant, customer support, data analyst...
- **Files mới:** `agent-wizard/` directory

#### F3.2 Team Board Enhancements
- **Priority levels**: Critical/High/Medium/Low với color coding
- **Filter bar**: by assignee, by priority, by status, by label
- **Task labels**: custom color labels
- **Due dates**: datetime picker + overdue indicator
- **Bulk actions**: move multiple cards, bulk assign, bulk close
- **Timeline view**: Gantt-style với deadlines
- **Files cần sửa:** `kanban-board.tsx`, `kanban-card.tsx`, `kanban-column.tsx`, `create-task-dialog.tsx`

#### F3.3 Alert & Notification System (mới)
- Define alert rules: error rate > X%, cost > Y$/day, agent offline > Z min
- Notification delivery: in-app banner + optional channel webhook
- Alert history page
- In-app notification bell với queue
- **Files mới:** `alerts/` page, `use-notification-store`
- **Backend mới:** alert rule store + background checker cron

#### F3.4 Session Replay
- Replay session: xem từng bước pipeline đã chạy
- Step-through: context → history → prompt → think → act → observe → memory → summarize
- Diff view: thay đổi memory sau mỗi session
- Export session as markdown
- **Files cần sửa:** `session-detail-page.tsx`
- **Files mới:** `session-replay.tsx`

#### F3.5 Storage File Browser
- Tree view cho S3-compatible storage
- Upload, download, delete files
- Preview: images, text, JSON
- Search by filename
- **Files cần sửa:** `storage-page.tsx`
- **Files mới:** `storage-browser.tsx`, `storage-file-row.tsx`

#### F3.6 Cron Visual Builder
- Visual cron expression editor (click-based)
- Timezone picker
- Next 5 runs preview
- Run history với log output preview
- **Files cần sửa:** `cron-page.tsx`
- **Files mới:** `cron-expression-editor.tsx`

---

### Phase 4 — Platform Maturity (6+ tuần)

#### F4.1 Orchestration Visualizer
- Canvas view: drag-drop agents, draw delegation links visually
- Link properties: sync/async, concurrency limit, timeout
- **Deps cần thêm:** `@xyflow/react` (React Flow)

#### F4.2 Vault 2.0 — Document Intelligence
- In-app rich text editor (create/edit documents)
- `[[wikilink]]` autocomplete khi gõ
- Backlinks panel
- Document version history
- Tag system (filter by tag)
- **Deps cần thêm:** `tiptap`

#### F4.3 Usage Analytics Pro
- Cost forecast (dự đoán cuối tháng)
- Budget alerts: set budget per tenant/agent
- Per-user cost breakdown (multi-tenant)
- Scheduled reports
- Anomaly detection (highlight spikes)

#### F4.4 Mobile App (Expo)
- Chat interface native mobile
- Push notifications khi agent reply
- Voice input → TTS output
- Offline queue khi mất mạng
- **Stack:** Expo + React Native

---

## 26. UI/UX Redesign Spec

### 26.1 Design System

#### Color Palette
| Role | Color | Hex |
|---|---|---|
| Primary | Deep indigo | `#4F46E5` |
| Accent | Electric violet | `#7C3AED` |
| Success | Emerald | `#10B981` |
| Warning | Amber | `#F59E0B` |
| Error | Rose | `#F43F5E` |
| Background dark | Warm slate | `#0F1117` |
| Sidebar dark | Elevated dark | `#161B27` |
| Background light | Off-white | `#F8FAFC` |

#### Typography
- Heading: `Inter` hoặc `Geist`
- Monospace: `JetBrains Mono` (code, traces, logs)
- Body: `Inter`, 14px desktop / 16px mobile (tránh iOS zoom)

### 26.2 Layout Wireframes

#### Sidebar (sau redesign)
```
[GoClaw Logo]
──────────────────
[🔍 Search everything... Cmd+K]

★ FAVORITES (user-configured)
  ○ Chat
  ○ Agents

CORE
  ○ Overview
  ○ Chat
  ○ Agents
  ○ Teams

[▼ More...]
──────────────────
[👤 User info]
[● Connected]
```

#### Dashboard 2.0
```
┌──────────────────────────────────────────────────────┐
│ Overview                    [Refresh] [Last 24h ▾]   │
├──────────┬──────────┬──────────┬────────────────────┤
│ 🟢 Uptime│ 🤖 Active│ 💰 Today │ 📊 Requests        │
│  14d 3h  │  5/8 agts│  $2.34   │  1,234             │
├──────────┴──────────┴──────────┴────────────────────┤
│ Agent Health Grid                                    │
│ [Claude ✅] [GPT-4 ✅] [Gemini ⚠️] [DeepSeek 🔴]   │
├──────────────────────────┬───────────────────────────┤
│ Recent Activity           │ Token Trend (7d)          │
│ • Claude: task done 2m    │ [area chart sparkline]    │
│ • Cron ran @ 09:00        ├───────────────────────────┤
│ • Slack: new message       │ Top Channels             │
│ • Error: Telegram timeout  │ Telegram:  234 msgs      │
│                            │ Discord:    89 msgs      │
├──────────────────────────┴───────────────────────────┤
│ System Health: DB ✅ Redis ✅ KG ✅   [+ New Agent]  │
└──────────────────────────────────────────────────────┘
```

#### Chat Page (sau redesign)
```
┌──────────┬──────────────────────────────┬───────────┐
│ Sessions │       Chat Thread            │ Task Panel│
│          │                              │ [toggle]  │
│ [Search] │  ┌─ User ────────────────┐  │           │
│ ──────── │  │ Hello!                │  │ Tasks (3) │
│ Claude   │  └───────────────────────┘  │ • Task A  │
│ 2m ago   │  ┌─ Claude ──────────────┐  │ • Task B  │
│ "Hello!" │  │ [thinking...]         │  │           │
│          │  │ Here's my response... │  │           │
│ GPT-4    │  └───────────────────────┘  │           │
│ 1h ago   ├──────────────────────────────┤           │
│          │ [📎] [Type message...] [→]   │           │
└──────────┴──────────────────────────────┴───────────┘
```

#### Agent Detail (sau redesign)
```
┌──────────────────────────────────────────────────────┐
│ ← Agents  /  Claude-Assistant    [Open Chat] [···]  │
├──────────────────────────────────────────────────────┤
│ [Overview] [Context] [Tools] [Memory] [Advanced]     │
├──────────────────────────────────────────────────────┤
│ Overview Tab:                                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │ Provider │ │ Sessions │ │ Tokens   │             │
│ │Anthropic │ │  1,234   │ │  2.4M    │             │
│ └──────────┘ └──────────┘ └──────────┘             │
│                                                      │
│ Recent Sessions (last 5)      7-day token trend     │
│ [list with timestamps]        [sparkline chart]     │
└──────────────────────────────────────────────────────┘
```

### 26.3 Interaction Patterns

#### Global Command Palette (Cmd+K)
```
┌──────────────────────────────────────────────┐
│ 🔍 Search or type a command...               │
├──────────────────────────────────────────────┤
│ RECENT                                       │
│  💬 Chat with Claude                         │
│  📄 Vault: project-notes.md                  │
├──────────────────────────────────────────────┤
│ ACTIONS                                      │
│  ➕ Create new agent                          │
│  💬 New chat session                          │
│  ⚡ Run cron job                              │
└──────────────────────────────────────────────┘
```

#### Empty States — mỗi trang cần có:
- Illustration phù hợp context
- CTA rõ ràng
- Ví dụ: Sessions empty → "Start your first conversation" → [Open Chat]

#### Toast & Notification
- Toast: bottom-right, auto-dismiss 4s
- Important alerts: top banner, manual dismiss
- Notification bell: queued in-app notifications

---

## 27. Prioritized Backlog

### P0 — Critical (làm ngay)
1. **F1.2** Agent Detail Tabbed Layout
2. **F1.3** Chat: session search + session preview text
3. **F2.3** Dashboard 2.0
4. **F1.1** Sidebar Favorites + cleanup
5. **F2.6** Global Command Palette (Cmd+K)

### P1 — High Priority (sprint 2-3)
6. **F2.1** Knowledge Graph Visualization (force-directed)
7. **F2.2** Traces Waterfall View
8. **F1.4** Logs Filter/Search/Level
9. **F1.5** Approvals Bulk Actions + Timeout
10. **F1.6** Onboarding Flow

### P2 — Medium Priority (sprint 4-6)
11. **F3.1** Agent Builder Visual Wizard
12. **F3.2** Team Board Enhancements (priority, filter, labels, due dates)
13. **F2.4** Provider Comparison
14. **F2.5** Skills Syntax Highlight
15. **F3.5** Storage File Browser

### P3 — Future (backlog)
16. **F4.1** Orchestration Visualizer (React Flow)
17. **F4.2** Vault 2.0 Editor (TipTap)
18. **F4.3** Usage Analytics Pro
19. **F3.3** Alert & Notification System
20. **F3.4** Session Replay
21. **F3.6** Cron Visual Builder
22. **F4.4** Mobile App (Expo)

---

## 28. Technical Implementation Notes

### 28.1 Thư viện cần thêm (Frontend)

| Feature | Library | Lý do chọn |
|---|---|---|
| KG Visualization | `react-force-graph-2d` | WebGL mode cho graph lớn, API đơn giản |
| Orchestration canvas | `@xyflow/react` | Battle-tested, React-native |
| Syntax highlight | `shiki` | Tree-sitter, lighter than Prism, accurate |
| Rich text editor (Vault) | `tiptap` | ProseMirror-based, extensible |
| Command palette | `cmdk` | Radix ecosystem compatible |
| PDF export | `@react-pdf/renderer` | Pure React approach |
| Virtual scroll | `@tanstack/virtual` | Cho traces waterfall >500 spans |

### 28.2 Zustand Stores cần thêm

| Store | Mục đích |
|---|---|
| `use-favorites-store` | User-pinned nav items |
| `use-notification-store` | In-app notification queue |
| `use-command-store` | Command palette state + recent items |
| `use-onboarding-store` | Onboarding checklist progress |

### 28.3 API Backend mới cần xây dựng

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/analytics/alerts` | GET/POST/DELETE | Alert rule management |
| `/v1/analytics/forecast` | GET | Cost forecast |
| `/v1/storage/files` | GET/POST/DELETE | File browser API |
| `/v1/sessions/:key/replay` | GET | Session replay steps |
| `/v1/agents/:id/test` | POST | Quick agent test |
| `/v1/providers/:id/test` | POST | Quick provider test |

### 28.4 Performance Considerations

- **Knowledge Graph >1000 nodes**: dùng WebGL renderer của `react-force-graph-2d`
- **Traces >500 spans**: virtualize rows với `@tanstack/virtual`
- **Chat messages**: virtual scroll thay vì render toàn bộ DOM
- **Vault Graph**: lazy load chỉ khi tab active (đã có `lazy()`, keep as-is)

### 28.5 i18n cho features mới

Mỗi tính năng mới cần:
1. Thêm keys vào `internal/i18n/keys.go` (backend strings)
2. Thêm translations vào `catalog_en.go`, `catalog_vi.go`, `catalog_zh.go`
3. Thêm UI strings vào `ui/web/src/i18n/locales/{en,vi,zh}/`

---

## 29. Trạng Thái Hiện Tại

### Production-tested (stable)
- 8-stage agent pipeline v3
- PostgreSQL multi-tenant
- Anthropic + OpenAI providers
- Telegram, Discord, Slack channels
- 3-tier memory system
- Team orchestration (basic)
- WebSocket protocol v3
- Desktop Lite edition

### In-progress / Experimental
- WhatsApp native (whatsmeow)
- Self-evolution guardrails
- Knowledge Graph auto-extraction
- Knowledge Vault full-text + semantic
- Zalo Personal
- OpenTelemetry export

### Success Metrics (3 months post-redesign)

| Metric | Target |
|---|---|
| Time to first agent message | < 2 phút |
| Bounce rate trên Agent Detail | -40% |
| Chat session search usage | >30% daily users |
| Knowledge Graph page visits | +100% |
| Approvals resolution time | -50% |
| Dashboard → action conversion | >60% users take action |
