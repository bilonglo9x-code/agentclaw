# AgentClaw (GoClaw) — App Spec & Feature Development Plan

> Phân tích đầy đủ từ repo https://github.com/bilonglo9x-code/agentclaw  
> Mục tiêu: Plan tính năng mới + Redesign UI/UX

---

## 1. Tổng quan ứng dụng

**GoClaw** là một **Multi-Tenant AI Agent Platform** — gateway chạy nhiều AI agent đồng thời, hỗ trợ 20+ LLM provider, 7 kênh nhắn tin, kiến trúc multi-tenant PostgreSQL. Đây là một platform hoàn chỉnh để build, deploy, và vận hành các AI agent trong môi trường production.

### Stack kỹ thuật

| Layer | Technology |
|---|---|
| Backend | Go 1.26, Cobra CLI, gorilla/websocket, pgx/v5, golang-migrate |
| Web UI | React 19, Vite 6, TypeScript, Tailwind CSS 4, Radix UI, Zustand, React Router 7 |
| Desktop | Wails v2 + React (SQLite, no Docker needed) |
| DB (server) | PostgreSQL 18 + pgvector |
| DB (desktop) | SQLite (modernc.org/sqlite) |
| Protocol | WebSocket RPC (req/res/event frames) + HTTP REST |
| i18n | en / vi / zh |

---

## 2. Kiến trúc hệ thống

### 2.1 Agent Pipeline (8 giai đoạn)
```
context → history → prompt → think → act → observe → memory → summarize
```
Mỗi stage là pluggable callback, chạy luôn luôn (always-on).

### 2.2 Bộ nhớ 3 tầng
```
Working (conversation)
  └─ Episodic (session summaries)
       └─ Semantic (Knowledge Graph / pgvector)
```
Progressive loading: L0 (working) → L1 (episodic) → L2 (semantic/KG).

### 2.3 Multi-tenant
- Per-user workspace, per-user context files
- AES-256-GCM encrypted API keys
- RBAC: owner / admin / operator / viewer
- PostgreSQL schema: mỗi tenant hoàn toàn isolated

### 2.4 4 chế độ Prompt
- **Full** — tất cả context
- **Task** — task-focused
- **Minimal** — tiết kiệm token
- **None** — raw LLM

### 2.5 WebSocket Protocol
Frame types: `req` / `res` / `event`. Request đầu tiên phải là `connect`.

---

## 3. Bản đồ tính năng hiện tại

### 3.1 Navigation Groups (Sidebar)

```
CORE
  ├── Overview (Dashboard)
  ├── Chat
  ├── Agents
  └── Agent Teams

CONVERSATIONS
  ├── Sessions
  ├── Pending Messages
  └── Contacts

CONNECTIVITY
  ├── Channels (Telegram, Discord, Slack, Zalo, Feishu, WhatsApp)
  └── Nodes (Pairing với thiết bị ngoài)

CAPABILITIES
  ├── Skills (BM25 + semantic search, upload zip)
  ├── Builtin Tools (30+ tools, 8 categories)
  ├── MCP Servers (stdio, sse, streamable-http)
  ├── TTS (OpenAI, ElevenLabs, Edge, MiniMax)
  ├── Cron (scheduler: at/every/cron expr)
  └── Hooks (extensibility hooks)

DATA
  ├── Memory (Working + Episodic memory documents)
  ├── Vault (Knowledge Vault, wikilinks, hybrid search)
  ├── Knowledge Graph (entity browser)
  └── Storage (file storage)

MONITORING
  ├── Traces (LLM call tracing, spans, latency)
  ├── Realtime Events (live event stream)
  ├── Activity (audit log)
  └── Logs (server logs)

SYSTEM (Admin only)
  ├── Tenants (owner only)
  ├── Providers (20+ LLM providers)
  ├── CLI Credentials
  ├── API Keys
  ├── Packages
  ├── Config (owner only)
  ├── Approvals (tool execution approval workflow)
  ├── Import/Export
  └── Backup/Restore (owner only)
```

### 3.2 Chi tiết từng trang

#### `/overview` — Dashboard
- **Stat cards**: Uptime, Agents, Providers, Total cost, Requests
- **Tabs**: Dashboard | Usage Analytics
- Usage tab: Token area chart, Request volume, Duration chart, Knowledge chart, Top Models table, Provider/Model/Channel distribution donuts
- System health card, Connected clients, Cron jobs card, Recent requests, Quota usage, Channel instances
- Auto-refresh mỗi 30s
- **Vấn đề**: Dashboard và Usage bị đặt trong cùng trang nhưng Usage là toàn bộ tab riêng → khó tìm, không intuitive

#### `/chat` — Chat Interface
- Sidebar trái: danh sách sessions theo agent
- Thread giữa: messages với streaming, thinking text, tool calls stream
- Input dưới: gửi tin, đính kèm file (drag-drop), media
- Agent picker khi chưa chọn agent
- Task panel bên phải (team tasks liên quan session)
- **Vấn đề hiện tại**: 
  - Thiếu search trong chat history
  - Không có bookmarks/pinned messages
  - Task panel và chat panel không có visual hierarchy rõ ràng
  - Mobile: sidebar bị ẩn hoàn toàn, khó switch giữa sessions

#### `/agents` — Agent Management
- View: Card / List (toggle)
- Filter: by owner, by type (open/predefined)
- Search, Pagination
- Agent card: name, model, provider, status badge
- Create dialog: wizard để tạo agent mới
- Detail page: 
  - Overview, Context files, Tools config, Memory settings, Sandbox config
  - Subagents config, Evolution settings, Compaction config, Context pruning
  - Sharing & access control
- Summoning modal (start/stop agent)
- Codex Pool page (admin)
- **Vấn đề**: Agent detail page quá dày đặc — nhiều config section nhưng flat layout, không có visual grouping tốt

#### `/teams` — Agent Teams
- Tabs: Teams | Links
- Team card + Team list row
- Detail page:
  - **Board tab**: Kanban board (create-task-dialog, drag-drop cards, column status)
  - **Members tab**: add/remove agents, permissions
  - **Settings tab**: orchestration mode (auto/explicit/manual), notifications, access control, workspace, features, audit logs
  - **Links tab**: inter-agent delegation links
- **Vấn đề**: Kanban board chưa có filter by assignee hoặc priority; team audit logs ở modal riêng thay vì integrated tab

#### `/sessions` — Session History
- List + Detail view
- Session message blocks với tool call rendering
- **Vấn đề**: Search/filter session rất hạn chế; không có tag/label session

#### `/skills` — Skills Management
- Table với search, upload, enable/disable
- Detail dialog: file browser, file tree, file viewers
- Skill upload: validate zip, resolve deps, create sub-zip
- Edit dialog, missing deps panel
- Tenant override system
- **Vấn đề**: File viewer trong skills detail không syntax-highlight; upload flow có nhiều bước nhưng UX chưa smooth

#### `/vault` — Knowledge Vault
- Tree view (VaultTree) + Document sidebar
- Filters: by agent, by team, by doc type
- Create document, Search dialog (hybrid BM25 + semantic)
- Graph view (lazy load) — visualize wikilink connections
- Filesystem sync (rescan workspace), Enrichment progress
- **Vấn đề**: Graph view loading rất chậm; sidebar và tree đôi khi cạnh tranh screen space; enrichment progress UX không intuitive

#### `/knowledge-graph` — Knowledge Graph Browser
- Filter by agent, by user
- Entities tab với stats
- Embedding status check
- **Vấn đề**: Rất sơ sài — chỉ có entity list, thiếu graph visualization đúng nghĩa (force-directed graph), thiếu relationship explorer

#### `/memory` — Memory Management
- Tabs: Working Memory documents | Episodic Memory
- Search dialog, Create dialog, Table view
- Embedding status indicator
- **Vấn đề**: Episodic tab chưa có visualization timeline; không có bulk delete

#### `/providers` — LLM Providers
- List với status badge, enable/disable
- Detail page: overview, embedding section, reasoning section, pool activity, OAuth sections
- Form dialog: standard fields, advanced settings
- Pool setup wizard
- CLI section, ACP section, OAuth section
- **Vấn đề**: Provider list không có quick-compare (cost, speed, capability); không có "test provider" quick action từ list view

#### `/channels` — Messaging Channels
- Channel instances với status
- Support: Telegram, Discord, Slack, Zalo OA, Zalo Personal, Feishu, WhatsApp
- **Vấn đề**: Channel health status không có realtime indicator; logs per channel rất hạn chế

#### `/traces` — LLM Tracing
- List + Detail dialog
- Span tree node rendering
- Preview block
- **Vấn đề**: Thiếu filter by status (error/success); span tree không có latency waterfall chart; không export trace

#### `/cron` — Job Scheduler
- List + Detail view
- at/every/cron expr support
- **Vấn đề**: Không có cron expression editor (visual); run history rất hạn chế

#### `/builtin-tools` — Built-in Tools
- 30+ tools, 8 categories
- Enable/disable per tool per agent
- **Vấn đề**: List quá dài, không có category filter; không có quick docs cho mỗi tool

#### `/mcp` — MCP Servers
- CRUD MCP server configs
- Grants: per-agent, per-user
- Transport: stdio/sse/streamable-http
- **Vấn đề**: Connection status không live; không có test connection button

#### `/tts` — Text-to-Speech
- Provider setup (OpenAI, ElevenLabs, Edge, MiniMax)
- Credentials section, Behavior section, Test playground
- **Vấn đề**: Playground UX cơ bản; không có voice preview library

#### `/approvals` — Tool Execution Approvals
- Queue của tool calls cần approve/reject
- **Vấn đề**: Không có bulk approve; không có timeout indicator cho mỗi request

#### `/storage` — File Storage
- S3-compatible config
- **Vấn đề**: Không có file browser UI thực sự; chỉ config, không manage files

#### `/logs` — Server Logs
- Live log stream
- **Vấn đề**: Không có log level filter; không có search; không có time range filter

#### `/overview → Usage tab` — Analytics
- Token area chart (timeseries)
- Request volume chart
- Duration chart (avg, p50, p95)
- Knowledge chart
- Top models table
- Distribution: provider/model/channel donuts
- Filter bar: time range, agent, provider
- Export CSV
- **Vấn đề**: Embedded trong Overview làm khó discover; không có scheduled report; không có alerting

---

## 4. Phân tích UI/UX hiện tại

### 4.1 Điểm mạnh
- **Component library**: Dùng Radix UI + Tailwind CSS 4 → consistent, accessible
- **Mobile-first conventions**: dvh, safe-area, touch targets ≥44px, virtual keyboard handling
- **Sidebar collapse**: w-64 ↔ w-16, responsive mobile drawer
- **WebSocket-first**: Real-time updates qua events, không polling nhiều
- **i18n**: 3 ngôn ngữ (en/vi/zh)
- **Role-based nav**: Admin-only sections ẩn với viewer
- **Error boundaries**: Per-route với stable key

### 4.2 Pain points chính

| # | Vấn đề | Mức độ | Trang bị ảnh hưởng |
|---|--------|--------|-------------------|
| P1 | **Information overload trên Agent Detail**: Tất cả config sections đổ xuống 1 page phẳng | Critical | `/agents/:id` |
| P2 | **Dashboard không có actionable insights**: Overview hiện thị số liệu nhưng không guide user làm gì tiếp theo | High | `/overview` |
| P3 | **Chat UX thiếu features**: No search, no bookmark, no message reactions, no session labels | High | `/chat` |
| P4 | **Knowledge Graph chỉ có entity list**: Thiếu graph visualization thực sự | High | `/knowledge-graph` |
| P5 | **Vault graph load chậm**: UX không responsive khi graph lớn | High | `/vault` |
| P6 | **Traces không có waterfall view**: Span tree khó đọc, không có latency axis | Medium | `/traces` |
| P7 | **Providers không có quick-compare**: Phải vào từng provider để xem details | Medium | `/providers` |
| P8 | **Skills file viewer thiếu syntax highlight** | Medium | `/skills` |
| P9 | **Approvals thiếu bulk action và timeout display** | Medium | `/approvals` |
| P10 | **Logs page thiếu filter/search** | Medium | `/logs` |
| P11 | **Cron không có visual expression builder** | Low | `/cron` |
| P12 | **Storage thiếu file browser** | Low | `/storage` |
| P13 | **Navigation quá nhiều items** (30+ links) → cognitive overload | High | Sidebar |

### 4.3 UX Gaps theo user journey

#### Journey 1: First-time setup
- Setup wizard: ✅ có (step-provider → step-model → step-agent → step-channel)
- Nhưng sau setup wizard, user không biết làm gì tiếp → **thiếu onboarding flow**

#### Journey 2: Daily use — Chat với agent
- Open chat → pick agent (nếu chưa có session) → type message
- **Gap**: Không có "recent agents" quick-pick; session list không có preview text

#### Journey 3: Monitor agent performance
- Traces → detail → span tree
- **Gap**: Không có alert khi agent error rate tăng; không có SLA dashboard

#### Journey 4: Build agent team
- Create team → add members → configure orchestration → create tasks
- **Gap**: Kanban board thiếu bulk actions; team settings rải rác trong nhiều modal

---

## 5. Feature Development Plan

### Phase 1 — UX Foundation (Quick Wins, 2-3 tuần)

#### F1.1 Sidebar Redesign — Collapsible Groups với Favorites
- Cho phép user pin/favorite nav items → hiện ở top
- Nhóm các items ít dùng vào "More..." expandable section
- Số lượng badge trên sidebar items (pending approvals, unread messages)
- **Files**: `sidebar.tsx`, `sidebar-group.tsx`, `sidebar-item.tsx`, Zustand store

#### F1.2 Agent Detail — Tabbed Layout
- Thay layout phẳng bằng Tabs: **Overview | Context | Tools | Memory | Advanced**
- Overview: card summary, quick stats, recent activity
- Context: context files editor
- Tools: tool policy + builtin toggle + MCP grants
- Memory: compaction, pruning, episodic config
- Advanced: sandbox, subagents, evolution, self-evolution
- **Files**: `agent-detail-page.tsx` và tất cả section files

#### F1.3 Chat Enhancements
- **Session search**: full-text search trong session list
- **Session labels/tags**: đặt tên nhóm sessions
- **Message bookmark**: star quan trọng messages
- **Copy message**: one-click copy assistant output
- **Session preview**: show last message text trong sidebar
- **Files**: `chat-page.tsx`, `chat-sidebar.tsx`, `chat-thread.tsx`

#### F1.4 Logs Page — Filter & Search
- Log level filter: DEBUG / INFO / WARN / ERROR
- Full-text search trong logs
- Time range picker
- Auto-scroll toggle
- Export logs as text
- **Files**: `logs-page.tsx`

#### F1.5 Approvals — Bulk Actions & Timeout
- Checkbox multi-select → bulk approve/reject
- Countdown timer mỗi approval request (timeout warning)
- Filter by agent, by tool category
- **Files**: `approvals-page.tsx`

---

### Phase 2 — Core Feature Upgrades (3-4 tuần)

#### F2.1 Knowledge Graph Visualization
- Force-directed graph (D3.js hoặc react-force-graph)
- Node: entity types với màu khác nhau (person/concept/event/place)
- Edge: relationship type labels
- Click node → entity detail panel
- Zoom/pan controls
- Filter: by agent, by entity type, by relationship
- Search: highlight matching nodes
- **Files**: `knowledge-graph-page.tsx`, new `kg-graph-view.tsx`
- **Deps**: `react-force-graph` hoặc `@antv/g6`

#### F2.2 Traces — Waterfall View
- Span waterfall chart (gantt-style): trục X là time, mỗi span là 1 row
- Color coding: LLM call / tool call / memory / other
- Hover tooltip: duration, status, token count
- Error spans highlighted đỏ
- Export trace as JSON
- Filter: by status (success/error/timeout), by agent, by provider, by time range
- **Files**: `traces-page.tsx`, `trace-detail-dialog.tsx`, new `trace-waterfall.tsx`

#### F2.3 Dashboard 2.0
- **Actionable cards**: mỗi metric card có "View →" link hoặc quick action
- **Alert banner**: tự động hiện khi có issues (no provider, channel down, high error rate)
- **Agent health grid**: mini status card cho từng agent
- **Recent activity feed**: merged events từ sessions, cron, channels
- **Cost trend**: sparkline cost 7 ngày
- **Tách Usage ra trang `/usage` riêng** trong sidebar (dưới Monitoring group)
- **Files**: `overview-page.tsx`, các component cards, sidebar items

#### F2.4 Provider Comparison
- Provider list có thêm cột: avg latency (30 days), cost/1K tokens, status
- "Compare" mode: chọn 2-3 providers → side-by-side comparison table
- Quick test: gửi prompt test ngay từ list view, xem response time + cost
- **Files**: `providers-page.tsx`, `provider-list-row.tsx`, new `provider-compare-dialog.tsx`

#### F2.5 Skills Viewer — Syntax Highlight
- Tích hợp `shiki` hoặc `highlight.js` cho file viewer
- Support: Go, Python, TypeScript, JSON, YAML, Markdown, Shell
- Thêm copy button cho mỗi file
- Line numbers
- **Files**: `skill-file-viewers.tsx`

---

### Phase 3 — Advanced Features (4-6 tuần)

#### F3.1 Agent Builder — Visual Wizard
- Thay create dialog đơn giản bằng multi-step wizard với preview:
  - Step 1: Identity (name, description, personality)
  - Step 2: Capabilities (tools, skills, MCP)
  - Step 3: Memory (memory mode, vault, KG)
  - Step 4: Channels (liên kết channel)
  - Step 5: Review & Launch
- Live preview: system prompt preview bên phải
- Template gallery: chọn template agent phổ biến (coding assistant, customer support, data analyst...)
- **Files**: new `agent-wizard.tsx` flow

#### F3.2 Team Board Enhancements
- **Priority levels**: Critical/High/Medium/Low với color coding
- **Filter bar**: by assignee (agent), by priority, by status, by label
- **Task labels**: custom color labels
- **Due dates**: datetime picker + overdue indicator
- **Bulk actions**: move multiple cards, bulk assign, bulk close
- **Timeline view**: Gantt-style view cho tasks với deadline
- **Board templates**: pre-built workflows (Sprint, Kanban, etc.)
- **Files**: `kanban-board.tsx`, `kanban-card.tsx`, `kanban-column.tsx`, `create-task-dialog.tsx`

#### F3.3 Alert & Notification System
- Define alert rules: error rate > X%, cost > Y$/day, agent offline > Z min
- Notification delivery: in-app banner + optional email/channel webhook
- Alert history page
- **Files**: new `alerts/` page directory, backend: new alert store + cron job

#### F3.4 Session Replay
- Khả năng replay lại một session: xem từng bước agent pipeline đã chạy
- Step-through: context → history → prompt → think → act → observe → memory → summarize
- Diff view: thay đổi memory sau mỗi session
- Export session as markdown/PDF
- **Files**: `session-detail-page.tsx`, new `session-replay.tsx`

#### F3.5 Storage File Browser
- Tree view cho S3-compatible storage
- Upload, download, delete files
- Preview: images, text files, JSON
- Search by filename
- **Files**: `storage-page.tsx`, new `storage-browser.tsx`, `storage-file-row.tsx`

#### F3.6 Cron Visual Builder
- Visual cron expression editor (click-based, no manual typing)
- Timezone picker
- Next 5 runs preview
- Run history với log output preview
- Retry config per job
- **Files**: `cron-page.tsx`, new `cron-expression-editor.tsx`

---

### Phase 4 — Platform Maturity (6+ tuần)

#### F4.1 Multi-Agent Orchestration Visualizer
- Canvas view: drag-drop agents, draw delegation links visually
- Link properties: sync/async, concurrency limit, timeout
- Simulate: dry-run một orchestration flow với mock input
- **Files**: new `orchestration/` page, use react-flow

#### F4.2 Vault 2.0 — Document Intelligence
- In-app rich text editor (create/edit documents trực tiếp trong UI)
- [[wikilink]] autocomplete khi gõ
- Backlinks panel: xem document nào link đến document hiện tại
- Embedding status + re-embed button per document
- Document version history
- Tag system (nhiều tag per document, filter by tag)
- **Files**: `vault-page.tsx`, `vault-detail-*.tsx`, new `vault-editor.tsx`

#### F4.3 Usage Analytics Pro
- **Cost forecast**: dự đoán chi phí cuối tháng dựa trên trend
- **Budget alerts**: set budget per tenant/agent → alert khi gần đạt
- **Per-user breakdown**: cost/tokens per user (multi-tenant)
- **Scheduled reports**: email weekly/monthly usage report
- **Anomaly detection**: highlight ngày có spike bất thường
- **Files**: `usage-page.tsx` + các component, backend: new analytics queries

#### F4.4 Plugin/Extension System
- Cho phép admin cài "extensions" — bundle gồm: skills + tools + provider config + UI widget
- Extension marketplace: browse, install, enable/disable
- Extension dev mode: test extension locally
- **Files**: new `extensions/` page, backend: extension registry

#### F4.5 Mobile App (Expo)
- Chat interface native mobile
- Push notifications khi agent reply
- Voice input → TTS output
- Offline-capable: queue messages khi mất mạng
- **Stack**: Expo + React Native, dùng chung API gateway

---

## 6. UI/UX Redesign Spec

### 6.1 Design System Updates

#### Color Palette
**Vấn đề hiện tại**: UI dùng Tailwind default colors, không có brand identity mạnh.

**Đề xuất**:
- Primary: Deep indigo (`#4F46E5`) — evoking intelligence, precision
- Accent: Electric violet (`#7C3AED`) — cho interactive elements
- Success: Emerald (`#10B981`)
- Warning: Amber (`#F59E0B`)
- Error: Rose (`#F43F5E`)
- Background: Warm slate (`#0F1117`) dark / `#F8FAFC` light
- Sidebar: Slightly elevated dark (`#161B27`)

#### Typography
- Heading: `Inter` hoặc `Geist` — clean, technical
- Monospace: `JetBrains Mono` — cho code, traces, logs
- Body: `Inter`, 14px base, 16px trên mobile

#### Spacing System
- Consistent 4px grid (dùng Tailwind spacing)
- Card padding: 16px (mobile) → 24px (desktop)

### 6.2 Layout Redesign

#### Sidebar — Tinh giản
```
[Logo]
─────────────────
[Search everything...]  ← global search shortcut (Cmd+K)

★ Favorites (user-configured)

CORE
  ○ Overview
  ○ Chat
  ○ Agents
  ○ Teams

[... more items collapsed ...]

─────────────────
[Avatar] [User info]
[Connection status indicator]
```

#### Dashboard — 2-column grid layout
```
┌─────────────────────────────────────────────────────┐
│ GoClaw Overview           [Refresh] [Time: Last 24h]│
├──────────────┬──────────────┬────────────┬──────────┤
│ 🟢 Uptime    │ 🤖 Agents   │ 💰 Cost    │ 📊 Req   │
│  14d 3h      │ 5 active    │ $2.34 today│ 1,234    │
├──────────────┴──────────────┴────────────┴──────────┤
│ [Agent Health Grid — mini status per agent]          │
├─────────────────────────┬───────────────────────────┤
│ Recent Activity Feed    │ Token Usage (sparkline)    │
│ • Agent "Claude" done   │ [area chart 7 days]        │
│ • Cron job ran @ 09:00  ├───────────────────────────┤
│ • Channel error: Slack  │ Top Channels               │
│                         │ Telegram: 234 msgs         │
│                         │ Discord:  89 msgs          │
├─────────────────────────┴───────────────────────────┤
│ System Health          [Quick Actions]               │
│ DB: ✅ Redis: ✅ KG: ✅  [+ New Agent] [Open Chat]  │
└─────────────────────────────────────────────────────┘
```

#### Chat Page — Cleaner 3-pane layout
```
┌──────────┬──────────────────────────┬─────────────┐
│ Sessions │     Chat Thread          │ Task Panel  │
│          │                          │ (collapsible│
│ [Search] │  ┌─ User ──────────┐    │ , opens on  │
│          │  │ Hello Claude!   │    │ demand)     │
│ Session1 │  └─────────────────┘    │             │
│ Session2 │  ┌─ Claude ────────┐    │             │
│ Session3 │  │ [thinking...]   │    │             │
│          │  │ Here's my plan: │    │             │
│ [+ New]  │  └─────────────────┘    │             │
│          ├──────────────────────────┤             │
│          │ [Attach] [Input field...] [Send]       │
└──────────┴──────────────────────────┴─────────────┘
```

#### Agent Detail — Tabbed với sidebar
```
┌─────────────────────────────────────────────────────┐
│ ← Agents  /  Claude-Assistant          [Chat] [···] │
├─────────────────────────────────────────────────────┤
│ [Overview] [Context] [Tools] [Memory] [Advanced]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Overview Tab:                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Provider │ │ Sessions │ │ Tokens   │            │
│  │ Anthropic│ │  1,234   │ │  2.4M    │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  Recent Sessions           Last 7 days trend       │
│  [list]                    [sparkline]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 Interaction Patterns

#### Global Command Palette (Cmd+K)
- Search agents, sessions, vault docs, skills
- Quick actions: "New chat with [agent]", "Create agent", "Run cron job"
- Recent items
- **Implementation**: `cmdk` library (đã có trong Radix ecosystem)

#### Contextual Actions
- Hover trên row → action buttons hiện ra (edit, delete, duplicate)
- Right-click menu cho context-specific actions
- Keyboard shortcuts hiển thị trong tooltips

#### Empty States
- Mỗi trang cần designed empty state với illustration + CTA
- Ví dụ: Sessions empty → "Start your first conversation with an agent" → [Open Chat]

#### Onboarding Flow (mới)
Sau setup wizard:
1. Welcome screen với checklist
2. "Create your first agent" → guided
3. "Connect a channel" → optional
4. "Send your first message" → CTA to chat
5. Dismiss và không hiện lại

#### Toast & Notification System
- Toast: bottom-right, auto-dismiss 4s
- Important alerts: top banner, manual dismiss
- In-app notification bell: queued notifications từ agents/channels

---

## 7. Technical Implementation Notes

### 7.1 Thư viện cần thêm

| Feature | Lib |
|---|---|
| Knowledge Graph vis | `react-force-graph-2d` |
| Orchestration canvas | `@xyflow/react` (React Flow) |
| Syntax highlight | `shiki` (lighter than prism, tree-sitter based) |
| Rich text editor (Vault) | `tiptap` (ProseMirror-based) |
| Cron builder | custom component hoặc `cron-builder-react` |
| Command palette | `cmdk` |
| Gantt/Timeline | `react-gantt` hoặc custom |
| PDF export | `@react-pdf/renderer` |

### 7.2 API mới cần xây dựng cho backend

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/analytics/alerts` | GET/POST/DELETE | Alert rule management |
| `/v1/analytics/forecast` | GET | Cost forecast |
| `/v1/storage/files` | GET/POST/DELETE | File browser |
| `/v1/sessions/:key/replay` | GET | Session replay data |
| `/v1/agents/:id/test` | POST | Quick agent test |
| `/v1/providers/:id/test` | POST | Quick provider test |

### 7.3 State Management

Hiện tại dùng Zustand stores:
- `use-auth-store` — auth, role, connected
- `use-ui-store` — sidebar, pageSize, timezone
- `use-logs-store` — live logs
- `use-chat-messages-store` — chat state
- `use-team-event-store` — team events

**Cần thêm**:
- `use-notification-store` — in-app notifications
- `use-favorites-store` — user-pinned nav items
- `use-command-store` — command palette state

### 7.4 Performance Considerations

- Knowledge Graph với >1000 nodes: cần WebWorker hoặc WebGL renderer (`react-force-graph` có WebGL mode)
- Vault graph: lazy load chỉ khi tab active (đã có `lazy()` — keep)
- Traces waterfall: virtualize với `@tanstack/virtual` cho >500 spans
- Chat messages: virtual scroll với `react-virtual` thay vì DOM dump toàn bộ history

---

## 8. Prioritized Backlog

### P0 — Critical (làm ngay)
1. **F1.2** Agent Detail Tabbed Layout — giảm cognitive load ngay lập tức
2. **F1.3** Chat search + session preview — daily use improvement
3. **F2.3** Dashboard 2.0 — first impression quan trọng
4. **F1.1** Sidebar Favorites + cleanup

### P1 — High Priority (sprint 2-3)
5. **F2.1** Knowledge Graph Visualization
6. **F2.2** Traces Waterfall View
7. **F1.4** Logs Filter/Search
8. **F1.5** Approvals Bulk Actions
9. **Global Command Palette (Cmd+K)**
10. **Onboarding Flow**

### P2 — Medium Priority (sprint 4-6)
11. **F3.1** Agent Builder Wizard
12. **F3.2** Team Board Enhancements
13. **F2.4** Provider Comparison
14. **F2.5** Skills Syntax Highlight
15. **F3.5** Storage File Browser

### P3 — Future (backlog)
16. **F4.1** Orchestration Visualizer
17. **F4.2** Vault 2.0 Editor
18. **F4.3** Usage Analytics Pro
19. **F3.3** Alert System
20. **F4.5** Mobile App (Expo)

---

## 9. Metrics để đo lường thành công

| Metric | Baseline (est.) | Target (3 months) |
|---|---|---|
| Time to first agent message | ~5 min | < 2 min |
| Bounce rate trên Agent Detail | High (complex) | -40% |
| Chat session search usage | 0% | >30% daily users |
| Knowledge Graph page visits | Low | +100% |
| Approvals resolution time | Manual, slow | -50% |
| Dashboard → action conversion | Low | >60% users take action from dashboard |

---

## 10. Tóm tắt

**GoClaw là một platform mạnh về backend** (8-stage pipeline, 3-tier memory, 20+ providers, multi-tenant RBAC) nhưng **UI/UX còn nhiều room to improve**, đặc biệt:

1. **Navigation overload** → Sidebar redesign với favorites + groups
2. **Agent config complexity** → Tabbed layout
3. **Chat UX thiếu table stakes** → Search, labels, bookmark
4. **Visualization gap** → Knowledge graph, Trace waterfall, Orchestration canvas
5. **Discoverability** → Command palette, Better empty states, Onboarding

Roadmap ưu tiên: **UX Polish (P0) → Core Visualizations (P1) → Power User Features (P2) → Platform Expansion (P3)**
