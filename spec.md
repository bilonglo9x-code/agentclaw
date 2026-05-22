# GoClaw — Mockdown Spec Chi Tiết

> Tài liệu này tổng hợp toàn bộ kiến trúc, cơ sở dữ liệu, API, pipeline, và UI của repo GoClaw.
> Mục đích: làm tài liệu tham chiếu khi build feature mới, onboard thành viên, hoặc lên kế hoạch refactor.

---

## 1. Tổng Quan Sản Phẩm

**GoClaw** là một AI agent platform đa tenant, đa kênh, được viết bằng Go.  
Nó hoạt động như một gateway thống nhất cho 20+ LLM providers, với đầy đủ bộ nhớ phân tầng, orchestration đa agent, và hỗ trợ 7 kênh nhắn tin.

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
│  Setup: [ContextStage]                                          │
│  Loop:  [ThinkStage → PruneStage → ToolStage →                  │
│           ObserveStage → CheckpointStage]                       │
│  Finalize: [FinalizeStage]                                      │
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

#### Semantic Memory — Knowledge Graph (`kg_entities`, `kg_relations`)

```sql
kg_entities   -- (agent_id, user_id, external_id, name, entity_type, confidence)
kg_relations  -- (source → relation_type → target, confidence)
```

### 4.6 Skills (`skills`, `skill_agent_grants`, `skill_user_grants`)

Skills là file SKILL.md được lưu filesystem + metadata trong DB.

| Field | Mô tả |
|---|---|
| `slug` | Unique identifier |
| `visibility` | `private` / `public` |
| `version` | Int version counter |
| `embedding` | vector(1536) cho semantic search |
| `tags` | TEXT[] + GIN index |
| `file_path` | Đường dẫn trên disk |

Grants: `skill_agent_grants` (pinned_version), `skill_user_grants`.

### 4.7 Cron Jobs (`cron_jobs`, `cron_run_logs`)

| schedule_kind | Mô tả |
|---|---|
| `cron` | Cron expression (6-field) |
| `every` | Interval milliseconds |
| `at` | One-shot datetime |

### 4.8 Agent Teams & Orchestration

```sql
agent_teams          -- (name, lead_agent_id, status, settings)
agent_team_members   -- (team_id, agent_id, role)
team_tasks           -- (subject, description, status, owner_agent_id, blocked_by[], priority, result)
                     -- status: pending | in_progress | done | failed
                     -- + tsvector FTS (subject + description)
team_messages        -- peer-to-peer mailbox (from_agent_id → to_agent_id)
delegation_history   -- mỗi lần delegate được persist
agent_links          -- link 2 agent lại để cho phép delegate
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

## 5. Agent Pipeline (v3)

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
| `BreakLoop` | Hoàn thành iteration hiện tại (ObserveStage cần capture) rồi thoát |
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
| L0 | Auto-inject vào mọi prompt (always-on) | Luôn luôn |
| L1 | Relevant chunks từ episodic + semantic | Query khi cần |
| L2 | Full document retrieval | Explicit request |

### 6.3 Consolidation Workers (internal/consolidation/)

| Worker | Trigger | Hành động |
|---|---|---|
| `episodic_worker` | Sau mỗi session | Tóm tắt session → episodic_memories |
| `semantic_worker` | Đủ episodic memories | Extract entities → KG |
| `dreaming_worker` | Theo schedule | Promote episodic → semantic |

---

## 7. LLM Providers

### 7.1 Danh sách provider

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

### 7.2 Shared Infrastructure

- `SSEScanner` (`providers/sse_reader.go`) — dùng chung cho tất cả streaming providers
- `RetryDo()` — retry wrapper với exponential backoff
- `ModelRegistry` — forward-compat resolver (alias models)
- `ProviderAdapter` — pluggable interface
- Capability system: image gen, reasoning, embeddings, thinking per-provider

---

## 8. Tool Registry (30+ tools)

### 8.1 Phân loại

| Category | Tools |
|---|---|
| **Filesystem** | `read_file`, `write_file`, `edit_file`, `list_files`, `search`, `glob` |
| **Runtime** | `exec` (với approval workflow), `browser` (Rod + CDP) |
| **Web** | `web_search` (Brave/DuckDuckGo/Exa/Tavily), `web_fetch` (content extraction) |
| **Memory** | `memory_search`, `memory_get`, `knowledge_graph_search` |
| **Media** | `create_image`, `create_audio`, `create_video`, `read_image/audio/video`, `tts` |
| **Skills** | `skill_search`, `use_skill`, `skill_manage` |
| **Teams** | `team_tasks`, `spawn`, `delegate`, `message` |
| **Automation** | `cron`, `heartbeat`, `sessions_*` |

### 8.2 Security

- Shell deny groups — blacklist pattern groups
- SSRF protection — block internal IPs
- Path traversal prevention
- Tool call prefix stripping
- Sandbox — Docker container isolation cho untrusted code
- Exec approval workflow — admin phải approve trước khi chạy

---

## 9. WebSocket Protocol (v3)

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

### 10.1 API Endpoints (grouped)

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

## 11. Multi-Tenant Architecture

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

### 11.3 Security stack

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

### 12.1 Channel Pipeline

```
Channel message → sanitize display name → rate limit check
    → routing metadata → history flush
    → dispatch to agent consumer
    → agent produces content
    → SanitizeAssistantContent() → markdownToTelegramHTML() (for Telegram)
    → chunkHTML() → sendHTML()
```

---

## 13. Web Dashboard UI

### 13.1 Stack

- React 19 + Vite 6 + TypeScript
- Tailwind CSS 4 + Radix UI
- Zustand (state management)
- React Router 7

### 13.2 Pages (routes)

| Route | Mô tả |
|---|---|
| `/chat` | Chat UI với agent — streaming, tool calls, history sidebar |
| `/agents` | Danh sách + CRUD agents |
| `/agents/:id` | Agent detail, context files, tools config, sharing |
| `/sessions` | Session manager |
| `/providers` | LLM provider config |
| `/skills` | Skills library + grants |
| `/mcp` | MCP server config + grants |
| `/teams` | Agent teams + Kanban task board |
| `/memory` | Memory viewer + delete |
| `/knowledge-graph` | KG entities + relations viewer |
| `/vault` | Knowledge Vault documents |
| `/channels` | Channel instances |
| `/cron` | Cron job manager |
| `/traces` | LLM call tracing |
| `/usage` | Token usage analytics |
| `/activity` | Audit log |
| `/storage` | Workspace file browser |
| `/builtin-tools` | Built-in tool settings |
| `/hooks` | Hook configuration |
| `/packages` | Skill dependencies |
| `/tts` | TTS config + voice list |
| `/api-keys` | API key management |
| `/backup-restore` | Backup/restore |
| `/config` | System config |
| `/setup` | Setup wizard |
| `/overview` | Dashboard overview |
| `/tenants-admin` | Multi-tenant admin (Standard only) |
| `/login` | Login page |

### 13.3 Zustand Stores

| Store | Nội dung |
|---|---|
| `use-auth-store` | Auth state, user info, token |
| `use-chat-messages-store` | Chat messages, streaming state |
| `use-ui-store` | UI preferences, timezone |
| `use-toast-store` | Toast notifications |
| `use-logs-store` | Log viewer state |
| `use-kg-detail-store` | KG detail panel state |
| `use-team-event-store` | Real-time team events |

### 13.4 Mobile UI Rules

- Dùng `h-dvh` thay `h-screen`
- Input font-size tối thiểu 16px (tránh iOS auto-zoom)
- Safe area insets cho notched devices
- Touch targets ≥ 44px
- Tables wrap trong `overflow-x-auto`
- `useVirtualKeyboard()` hook cho chat input

---

## 14. Desktop App (Lite)

### 14.1 Stack

- Wails v2 (Go backend + React frontend)
- Build tag: `//go:build sqliteonly`
- SQLite via `modernc.org/sqlite`
- OS Keyring (`go-keyring`) cho secrets

### 14.2 Paths

| Mục đích | Path |
|---|---|
| Data (SQLite) | `~/.goclaw/data/` |
| Config | `~/.goclaw/` |
| Workspace | `~/.goclaw/workspace/` |
| Secrets fallback | `~/.goclaw/secrets/` |
| Port | 18790 (localhost) |

### 14.3 Giới hạn Lite

- Max 5 agents, 1 team, 5 members, 50 sessions
- Không có: channels, heartbeat, file storage UI, skill self-manage, KG, RBAC, multi-tenant
- Tool gating qua `TeamActionPolicy`: không có comment/review/approve/reject/attach/ask_user
- `skill_manage`/`publish_skill` không được đăng ký

---

## 15. Self-Evolution System

```
Metrics Collection → Suggestion Analysis → Auto-Adapt (với guardrails)
```

| Stage | Mô tả |
|---|---|
| Metrics | Thu thập performance metrics trong sessions |
| Suggestion | LLM phân tích → gợi ý cải thiện |
| Adapt | Apply changes với rollback guard |

**Guardrails (không được thay đổi):**
- Identity, name, core purpose của agent
- Chỉ có thể thay đổi: communication style, domain expertise (CAPABILITIES.md)

---

## 16. Knowledge Vault

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

## 18. Configuration

- Format: **JSON5** (via `titanous/json5`)
- Path: env var `GOCLAW_CONFIG`
- Secrets: `.env.local` hoặc env vars (không bao giờ trong config.json)
- Hot reload: `fsnotify` watch trên config file
- Auto-onboard: khi `GOCLAW_*_API_KEY` env vars được set → tự onboard không cần interactive

### 18.1 Env Vars Quan Trọng

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
  - WS: `connect.locale` param
  - HTTP: `Accept-Language` header

### 20.2 Frontend

- `i18next` với namespace-split locale files
- Path: `ui/web/src/i18n/locales/{en,vi,zh}/`

### 20.3 Quy tắc thêm string mới

1. Thêm key vào `internal/i18n/keys.go`
2. Thêm translations vào CẢ 3 catalog files
3. Thêm UI strings vào CẢ 3 locale dirs
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
make test-invariants   # P0 - tenant isolation
make test-contracts    # P1 - API schemas (cần server đang chạy)
make test-scenarios    # P2 - user journeys (cần server đang chạy)
make test-critical     # P0 + P1 (pre-merge)
```

---

## 22. Dual-DB Pattern (PostgreSQL + SQLite)

Khi thêm schema change phải cập nhật CẢ HAI:

| Database | Nơi thêm |
|---|---|
| PostgreSQL | `migrations/XXXXXX_*.up.sql` + bump `RequiredSchemaVersion` trong `internal/upgrade/version.go` |
| SQLite | `internal/store/sqlitestore/schema.sql` (fresh schema) + incremental patch trong `schema.go migrations` map + bump `SchemaVersion` constant |

**Lý do:** Missing SQLite migration → desktop edition crash on startup.

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

## 25. Roadmap & Trạng Thái

Xem `CHANGELOG.md` cho trạng thái chi tiết từng feature (production-tested vs in-progress).

**Production-tested (stable):**
- 8-stage agent pipeline v3
- PostgreSQL multi-tenant
- Anthropic + OpenAI providers
- Telegram, Discord, Slack channels
- 3-tier memory
- Team orchestration (basic)
- WebSocket protocol v3
- Desktop Lite edition

**In-progress / experimental:**
- WhatsApp native (whatsmeow)
- Self-evolution guardrails
- Knowledge Graph auto-extraction
- Knowledge Vault full-text + semantic
- Zalo Personal
- OpenTelemetry export
