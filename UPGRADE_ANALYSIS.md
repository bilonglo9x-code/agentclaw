# GoClaw — Phân Tích Nâng Cấp 4 Chủ Đề

> Tài liệu này phân tích chi tiết 4 yêu cầu nâng cấp, trạng thái hiện tại trong codebase,  
> khoảng cách cần xây dựng, và kế hoạch implement cụ thể.

---

## Mục lục

1. [Chat Module Upgrade — Học theo LobeHub](#1-chat-module-upgrade--học-theo-lobehub)
2. [Admin Branding Customization](#2-admin-branding-customization)
3. [Theme System — Đa giao diện](#3-theme-system--đa-giao-diện)
4. [External API — Dùng Agent/Team từ bên ngoài](#4-external-api--dùng-agentteam-từ-bên-ngoài)

---

## 1. Chat Module Upgrade — Học theo LobeHub

### 1.1 Trạng thái hiện tại trong codebase

| Tính năng | Backend | Frontend UI | Ghi chú |
|---|---|---|---|
| Đổi tên session | ✅ WS method `sessions.label` | ❌ Chưa có UI | Backend auto-title khi message đầu tiên |
| Xoá session | ✅ WS `sessions.delete` (hard delete) | ✅ Có nút xoá | Hiện là **hard delete**, không có soft delete |
| Quick model switch | ✅ `user_agent_overrides` table | ❌ Chưa có UI trong chat | Backend đã hỗ trợ per-user model override |
| Tìm kiếm session | ❌ Không có | ❌ Không có | Cần cả backend filter + frontend UI |
| Preview last message | ❌ `sessions` table không store preview | ❌ Không hiển thị | Cần thêm field hoặc compute từ messages JSONB |
| Session labels/tags | ✅ `label` field tồn tại | Partial | Backend có label, UI không cho edit thủ công |
| Archive/pin session | ❌ Không có | ❌ Không có | Cần thêm `archived_at`, `pinned_at` |

### 1.2 LobeHub — Những gì nên học

LobeHub (lobe-chat) là một trong những chat UI phổ biến nhất cho LLM. Các pattern chính:

#### A. Chat Layout
```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (thu gọn được)      │ Chat Thread        │ Settings │
│                              │                    │ panel    │
│ [🔍 Search sessions]         │ [Agent header]     │ (slide   │
│ ──────────────               │  Quick model pick  │  out)    │
│ 📌 Pinned Sessions           │                    │          │
│  • Project Alpha             │ [Messages...]      │          │
│  • Research 2026             │                    │          │
│ ──────────────               │ [File attach area] │          │
│ Recent Sessions              │ [Input + Send]     │          │
│  • Untitled · 2m             │                    │          │
│  • Code review · 1h          │                    │          │
└──────────────────────────────┴────────────────────┴──────────┘
```

#### B. Quick Model Switcher (trong chat header)
```
[🤖 Claude Sonnet 3.7 ▾]  ← click để chọn model khác
    ┌─────────────────────────┐
    │ anthropic                │
    │  ● claude-sonnet-3.7    │ ← current
    │  ○ claude-opus-4        │
    │  ○ claude-haiku-3.5     │
    │ openai                   │
    │  ○ gpt-4o               │
    │  ○ gpt-4o-mini          │
    └─────────────────────────┘
```
→ Gọi `user_agent_overrides` (đã có backend support)

#### C. Session Sidebar với rename + soft delete
```
[Session name]  [⋯]
                 ├── ✏️ Rename
                 ├── 📌 Pin to top
                 ├── 🗃️ Archive
                 └── 🗑️ Delete
```

#### D. LobeHub Message Actions
- Hover message → action bar hiện ra: Copy | Retry | Branch | Quote | TTS | React
- Edit user message và re-run
- Branch conversation từ bất kỳ message nào

#### E. Agent Settings Panel (slide-in từ phải)
- Thay đổi system prompt on-the-fly
- Toggle tools
- Adjust temperature / max tokens
- Model switch

### 1.3 Gap Analysis và Implementation Plan

#### Gap 1: Quick Model Switcher trong Chat Header
**Backend**: `user_agent_overrides` ✅ — insert/update với `(agent_id, user_id, model, provider)`  
**Frontend cần làm**:
```tsx
// Trong ChatTopBar component, thêm ModelPicker dropdown
<ModelPicker
  agentId={agentId}
  currentModel={currentModel}
  currentProvider={currentProvider}
  onSelect={(provider, model) => {
    // Call WS: agents.setUserOverride {agentId, provider, model}
    // Hoặc HTTP PATCH /v1/agents/{id}/user-override
  }}
/>
```
**Files cần sửa**: `chat-top-bar.tsx`, thêm `model-picker.tsx`  
**API cần thêm**: WS method `agents.setUserOverride` hoặc HTTP PATCH `/v1/agents/{id}/user-override`

#### Gap 2: Session Rename (manual, không chỉ auto-title)
**Backend**: WS method `sessions.label` ✅ đã có  
**Frontend cần làm**:
- Context menu trên session item trong sidebar
- Double-click để edit inline
```tsx
// Trong SessionSwitcher / SessionItem component
<SessionItem
  onRename={() => {
    ws.call(Methods.SESSIONS_LABEL, { sessionKey, label: newName });
  }}
/>
```
**Files cần sửa**: `session-switcher.tsx` (hoặc tương đương), `use-chat-sessions.ts`

#### Gap 3: Soft Delete (Archive) thay vì Hard Delete
**Backend cần thêm**:
```sql
-- Migration: thêm archived_at vào sessions
ALTER TABLE sessions ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN pinned_at TIMESTAMPTZ;
```
```go
// WS method mới: sessions.archive
// sessions.list phải filter WHERE archived_at IS NULL (default)
// sessions.list với ?showArchived=true để lấy cả archived
```
**Frontend**: Thêm "Archive" action, tab "Archived" trong sidebar

#### Gap 4: Session Search
**Backend cần thêm**:
```go
// Mở rộng sessions.list WS method để nhận query param
// SELECT * FROM sessions WHERE label ILIKE '%query%' AND ...
// Hoặc FTS: WHERE to_tsvector(label) @@ plainto_tsquery(query)
```
**Frontend**:
```tsx
// Trong ChatSidebar
<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Search conversations..."
/>
// Filter sessions client-side (nếu < 100 sessions) hoặc server-side
```

#### Gap 5: Session Preview (last message text)
**Backend**: `sessions.messages` là JSONB → lấy last message khi list sessions  
**Hiệu quả nhất**: Thêm column `last_message_preview VARCHAR(200)` và update khi message mới

#### Gap 6: Message Actions (LobeHub-style)
**Frontend**: Hover → action bar trên mỗi message bubble
```tsx
// Trong ChatMessage component
<MessageActionBar>
  <CopyButton content={message.content} />
  <RetryButton onRetry={() => resendFromMessage(message.id)} />
  <TtsButton content={message.content} />  // đã có TTS backend
  <BookmarkButton />
</MessageActionBar>
```

### 1.4 Implementation Phases

**Sprint 1 (1 tuần)**:
- [ ] Quick model switcher dropdown trong chat header
- [ ] Session rename bằng context menu
- [ ] Search sessions (client-side filter)
- [ ] Session preview text (tính từ messages JSONB)

**Sprint 2 (1 tuần)**:
- [ ] Soft delete / Archive sessions (backend migration + API)
- [ ] Pin sessions (backend + UI)
- [ ] Message action bar (copy, TTS, bookmark)
- [ ] Agent settings slide-in panel

---

## 2. Admin Branding Customization

### 2.1 Trạng thái hiện tại

GoClaw đã có infrastructure rất phù hợp:

| Component | Trạng thái | Chi tiết |
|---|---|---|
| `system_configs` table | ✅ Tồn tại | Key-value store, per-tenant, encrypted support |
| `/v1/system-configs` API | ✅ Đầy đủ CRUD | GET/PUT/DELETE, yêu cầu role admin |
| `ApplySystemConfigs()` | ✅ Có | Overlay DB values lên in-memory config |
| `bus.TopicSystemConfigChanged` | ✅ Có | Hot reload khi config thay đổi |
| Frontend ThemeProvider | ✅ Có | Đọc từ Zustand store |
| **Branding keys** | ❌ Chưa có | Cần thêm `app.*` keys |
| **Admin Branding UI page** | ❌ Chưa có | Cần build trang mới |
| **Frontend BrandingProvider** | ❌ Chưa có | Cần đọc branding từ API |

### 2.2 Kiến trúc đề xuất

#### Backend: Branding Config Keys

Thêm vào `seedConfigForContext()` và `ApplySystemConfigs()`:

```go
// Branding keys (thêm vào config_system.go)
str("app.name",         &c.App.Name)         // default: "GoClaw"
str("app.logo_url",     &c.App.LogoURL)       // URL hoặc base64 SVG
str("app.favicon_url",  &c.App.FaviconURL)    // URL .ico hoặc .png
str("app.banner_url",   &c.App.BannerURL)     // Banner image cho login page
str("app.description",  &c.App.Description)   // Tagline
str("app.primary_color",&c.App.PrimaryColor)  // oklch(...) hoặc hex
str("app.support_url",  &c.App.SupportURL)    // Help/support link
str("app.privacy_url",  &c.App.PrivacyURL)    // Privacy policy link
boolean("app.show_powered_by", &c.App.ShowPoweredBy) // Show "Powered by GoClaw"
```

#### Expose Branding qua Public API

Cần một endpoint **không cần auth** để frontend lấy branding khi load:
```go
// GET /v1/branding — public, no auth required
// Returns: name, logo_url, favicon_url, banner_url, description, primary_color
mux.HandleFunc("GET /v1/branding", h.handleGetBranding)
```

#### Frontend: BrandingProvider

```tsx
// src/components/providers/branding-provider.tsx
export function BrandingProvider({ children }) {
  const { data: branding } = useQuery(['branding'], () =>
    fetch('/v1/branding').then(r => r.json())
  );

  useEffect(() => {
    if (!branding) return;
    // Cập nhật document title
    document.title = branding.name || 'GoClaw';
    // Cập nhật favicon
    if (branding.favicon_url) updateFavicon(branding.favicon_url);
    // Cập nhật CSS custom property cho primary color
    if (branding.primary_color) {
      document.documentElement.style.setProperty('--primary', branding.primary_color);
      document.documentElement.style.setProperty('--ring', branding.primary_color);
      document.documentElement.style.setProperty('--sidebar-primary', branding.primary_color);
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
```

### 2.3 Admin Branding UI Page

**Route**: `/admin/branding` (hoặc section trong `/config`)

```
┌─────────────────────────────────────────────────────────────┐
│ Branding & Identity                          [Save Changes] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ App Identity                                                │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ App Name         [GoClaw                          ]  │    │
│ │ Tagline          [Multi-Tenant AI Agent Platform  ]  │    │
│ │ Support URL      [https://docs.goclaw.sh          ]  │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Logo & Icons                                                │
│ ┌───────────────┐  ┌──────────────┐  ┌──────────────┐     │
│ │  [Logo]       │  │  [Favicon]   │  │  [Banner]    │     │
│ │  512x512 SVG  │  │  32x32 ICO   │  │  1200x400    │     │
│ │  [Upload]     │  │  [Upload]    │  │  [Upload]    │     │
│ └───────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│ Brand Color                                                 │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Primary Color  [████] #4F46E5                        │    │
│ │                                                      │    │
│ │ Presets: [🟠 Orange] [🔵 Blue] [🟣 Purple] [🟢 Green]│    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Preview                                                     │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [Mini preview của sidebar với branding mới]          │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Options                                                     │
│ ☑ Show "Powered by GoClaw" in footer                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 File Upload cho Logo/Favicon

**Backend**: Dùng existing storage system (`/v1/media`) hoặc tạo dedicated endpoint:
```go
// POST /v1/branding/upload — upload file, trả về URL
// Lưu vào S3/local storage, cập nhật system_config key
mux.HandleFunc("POST /v1/branding/upload", requireAuth("admin", h.handleUpload))
```

### 2.5 Implementation Plan

**Backend (2-3 ngày)**:
- [ ] Thêm `app.*` branding keys vào `config_system.go` + `ApplySystemConfigs()`
- [ ] Thêm `GET /v1/branding` public endpoint
- [ ] Thêm `POST /v1/branding/upload` file upload endpoint
- [ ] Dual-DB: thêm branding keys vào SQLite migration

**Frontend (3-4 ngày)**:
- [ ] `BrandingProvider` component với dynamic CSS vars + document.title + favicon
- [ ] Admin branding page `/admin/branding` hoặc section trong Config
- [ ] Color picker component (HSL/hex input + presets)
- [ ] Logo upload với preview
- [ ] Live preview trong admin UI

---

## 3. Theme System — Đa giao diện

### 3.1 Trạng thái hiện tại

GoClaw đã có nền tảng tốt:

| Component | Trạng thái | Chi tiết |
|---|---|---|
| `ThemeProvider` | ✅ Có | light / dark / system mode |
| CSS variables | ✅ Rất tốt | OKLCH color system, 30+ variables |
| `useUiStore.theme` | ✅ Zustand | Persisted trong localStorage |
| **Multiple themes** | ❌ Chưa có | Chỉ có light/dark |
| **Theme switcher admin** | ❌ Chưa có | |
| **Per-tenant theme** | ❌ Chưa có | |

### 3.2 Reference: setproduct.com Templates

**Xela template** (setproduct.com/templates/xela) và setproduct dashboards:
- Clean, modern admin dashboard patterns
- Component-first design system
- Dense information layout với sidebar navigation
- Card-based content areas

**Key patterns đáng học:**
1. **Left sidebar + topbar** — layout GoClaw đang dùng ✅
2. **Stat cards row** — đã có ✅
3. **Data tables với action columns** — đã có ✅
4. **Tabbed content areas** — một số trang đã có
5. **Slide-out panels** — chưa có nhiều, cần thêm
6. **Command palette** — chưa có, nên thêm

### 3.3 Đề xuất: 5 Built-in Themes

Mỗi theme là một bộ CSS variables hoàn chỉnh:

#### Theme 1: **Ember** (hiện tại — warm orange/brown)
```css
/* Hiện tại: oklch với primary orange #E97232 tone */
--primary: oklch(0.62 0.19 38);   /* warm orange */
--sidebar: oklch(0.97 0.005 80);  /* warm light */
```

#### Theme 2: **Indigo** (blue/purple — professional)
```css
--primary: oklch(0.55 0.22 264);  /* deep indigo */
--primary-foreground: oklch(1 0 0);
--sidebar: oklch(0.15 0.03 264);  /* dark indigo sidebar */
--sidebar-foreground: oklch(0.95 0.01 264);
--ring: oklch(0.55 0.22 264);
```

#### Theme 3: **Forest** (green — calm, nature)
```css
--primary: oklch(0.52 0.18 145);  /* emerald green */
--sidebar: oklch(0.14 0.03 145);  /* dark forest */
--chat-bubble-user: oklch(0.38 0.15 145);
```

#### Theme 4: **Slate** (minimal gray — focus mode)
```css
--primary: oklch(0.45 0.02 264);  /* neutral slate */
--sidebar: oklch(0.13 0.01 264);  /* near-black */
--border: oklch(0.25 0.01 264);
```

#### Theme 5: **Aurora** (purple/violet — creative)
```css
--primary: oklch(0.55 0.25 300);  /* violet/purple */
--sidebar: oklch(0.14 0.04 300);
--accent: oklch(0.22 0.06 300);
```

### 3.4 Architecture: Theme System

#### Option A: CSS Classes (recommended — ít breaking nhất)

```tsx
// theme-provider.tsx — mở rộng từ hiện tại
type Theme = "light" | "dark" | "system";
type ColorScheme = "ember" | "indigo" | "forest" | "slate" | "aurora"; // NEW

function applyTheme(theme: Theme, scheme: ColorScheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.remove("scheme-ember", "scheme-indigo", "scheme-forest", "scheme-slate", "scheme-aurora");

  // Apply light/dark
  if (theme === "system") {
    root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }

  // Apply color scheme
  root.classList.add(`scheme-${scheme}`);
}
```

```css
/* index.css — thêm scheme overrides */
.scheme-indigo {
  --primary: oklch(0.55 0.22 264);
  --ring: oklch(0.55 0.22 264);
  --sidebar-primary: oklch(0.55 0.22 264);
  --chat-bubble-user: oklch(0.40 0.20 264);
}

.scheme-forest {
  --primary: oklch(0.52 0.18 145);
  --ring: oklch(0.52 0.18 145);
  /* ... */
}

/* Dark mode + scheme combination */
.dark.scheme-indigo {
  --sidebar: oklch(0.15 0.03 264);
  --primary: oklch(0.62 0.20 264);
  /* ... */
}
```

#### Option B: Per-tenant theme từ system_configs

```go
// Backend: thêm vào branding keys
str("app.color_scheme", &c.App.ColorScheme)  // "ember" | "indigo" | "forest" | ...

// GET /v1/branding response thêm color_scheme field
```

```tsx
// Frontend: BrandingProvider apply cả color scheme
document.documentElement.classList.add(`scheme-${branding.color_scheme}`);
```

### 3.5 Admin Theme Switcher UI

**Trong trang Branding hoặc Settings**:
```
Theme Selection
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Mode:  [○ Light] [● Dark] [○ System]                       │
│                                                             │
│  Color Scheme:                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 🟠 Ember │ │ 🔵 Indigo│ │ 🟢 Forest│ │ ⬛ Slate │      │
│  │ (current)│ │          │ │          │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                            ┌──────────┐                     │
│                            │ 🟣 Aurora│                     │
│                            └──────────┘                     │
│                                                             │
│  ☑ Apply theme for all users in this tenant                 │
│  ☐ Allow users to override theme                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 Layout Variants (Tham khảo setproduct patterns)

Ngoài color scheme, có thể cung cấp **layout variants**:

| Variant | Mô tả |
|---|---|
| **Sidebar Left** | Layout hiện tại — sidebar trái, topbar trên |
| **Sidebar Compact** | Sidebar luôn collapsed (icon-only), hover để mở |
| **Top Navigation** | Không có sidebar, toàn bộ nav trên topbar (tabs/dropdown) |
| **Floating Sidebar** | Sidebar nổi lên, overlay content area |

**Implementation**: CSS class trên `<body>` + layout component switch

### 3.7 Implementation Plan

**Phase 1 (3-4 ngày)**:
- [ ] Thêm `colorScheme` vào `useUiStore` và `ThemeProvider`
- [ ] Định nghĩa 5 color schemes trong `index.css`
- [ ] Theme picker trong Topbar settings (user-level)
- [ ] Tích hợp với branding system_config (admin set default scheme)

**Phase 2 (3-4 ngày)**:
- [ ] Admin Theme Switcher page
- [ ] "Apply to all users" option (tenant-level default via system_config)
- [ ] User can override tenant default (per-user localStorage)

**Phase 3 (future)**:
- [ ] Layout variants (Compact, Top Nav)
- [ ] Custom theme builder (tự chọn màu bất kỳ)

---

## 4. External API — Dùng Agent/Team từ bên ngoài GoClaw

### 4.1 Trạng thái hiện tại — GoClaw đã có API khá tốt

| API | Trạng thái | Mô tả |
|---|---|---|
| `POST /v1/chat/completions` | ✅ Production-ready | **OpenAI-compatible** — drop-in replacement |
| `POST /v1/agents/{id}/wake` | ✅ Có | HTTP trigger đồng bộ (sync), trả về kết quả |
| `GET /ws` + `chat.send` | ✅ Có | WebSocket streaming — real-time |
| `POST /v1/responses` | ✅ Có | OpenAI Responses protocol |
| `POST /v1/tools/invoke` | ✅ Có | Invoke tool trực tiếp |
| **Team API** | ❌ Chưa có | Không có endpoint để trigger team |
| **Streaming Wake** | ❌ Chưa có | Wake chỉ là sync blocking |
| **Webhook callback** | ❌ Chưa có | Async run → callback URL |
| **Embed widget** | ❌ Chưa có | JS embed cho website bên ngoài |
| **SDK** | ❌ Chưa có | Official TypeScript/Python SDK |

### 4.2 `/v1/chat/completions` — OpenAI-compatible (ĐÃ CÓ)

Đây là API mạnh nhất, có thể dùng ngay:

```python
# Python — dùng openai library trỏ vào GoClaw
from openai import OpenAI

client = OpenAI(
    base_url="https://your-goclaw.com",
    api_key="gck_your_api_key_here"
)

# Model = agent_key (phần đặc biệt của GoClaw)
response = client.chat.completions.create(
    model="your-agent-key",       # agent_key làm model name
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True,
    extra_headers={
        "X-GoClaw-User-Id": "user-123",  # bind session to user
    }
)
```

```javascript
// Node.js — tương tự
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'https://your-goclaw.com', apiKey: 'gck_...' });
const response = await client.chat.completions.create({
  model: 'your-agent-key',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### 4.3 `/v1/agents/{id}/wake` — HTTP Trigger (ĐÃ CÓ)

```bash
# Trigger agent đồng bộ, nhận kết quả luôn
curl -X POST https://your-goclaw.com/v1/agents/agent-uuid/wake \
  -H "Authorization: Bearer gck_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze this data: ...",
    "session_key": "optional-session-key",
    "user_id": "user-123",
    "metadata": {"source": "n8n", "job_id": "abc123"}
  }'

# Response
{
  "content": "Here is my analysis...",
  "run_id": "uuid",
  "usage": {"prompt_tokens": 450, "completion_tokens": 320, "total_tokens": 770}
}
```

**Phù hợp cho**: n8n, Zapier, Make.com, custom webhooks, cron external triggers.

### 4.4 WebSocket — Real-time Streaming (ĐÃ CÓ)

```javascript
// JavaScript WebSocket client example
const ws = new WebSocket('wss://your-goclaw.com/ws');

ws.onopen = () => {
  // Step 1: Connect với API key
  ws.send(JSON.stringify({
    type: 'req', id: '1', method: 'connect',
    params: { token: 'gck_your_api_key', user_id: 'user-123' }
  }));
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  if (frame.type === 'event' && frame.event === 'chunk') {
    process.stdout.write(frame.payload.content); // streaming
  }
  if (frame.type === 'event' && frame.event === 'run.completed') {
    console.log('Done!');
    ws.close();
  }
};

// Step 2: Sau khi connect thành công, gửi message
ws.send(JSON.stringify({
  type: 'req', id: '2', method: 'chat.send',
  params: {
    agentId: 'agent-uuid',
    sessionKey: 'my-session-key',
    message: 'Hello from external app!'
  }
}));
```

### 4.5 Các API cần BUILD THÊM

#### A. Streaming Wake API (SSE)

Hiện tại `wake` là blocking sync. Cần thêm **streaming variant**:

```go
// POST /v1/agents/{id}/wake?stream=true
// Trả về SSE stream thay vì JSON blocking
mux.HandleFunc("POST /v1/agents/{id}/wake", h.handleWake)

// handleWake: nếu ?stream=true → SSE
// nếu không → blocking (hiện tại)
```

```bash
curl -X POST "https://goclaw.com/v1/agents/uuid/wake?stream=true" \
  -H "Authorization: Bearer gck_..." \
  -H "Accept: text/event-stream" \
  -d '{"message": "Hello"}'

# SSE response:
data: {"type":"chunk","content":"Hello"}
data: {"type":"chunk","content":" there!"}
data: {"type":"done","usage":{"total_tokens":123},"run_id":"uuid"}
```

#### B. Team API — Trigger cả team

```go
// POST /v1/teams/{id}/wake — trigger team task
// Returns task_id, team resolves async
type teamWakeRequest struct {
  Message    string `json:"message"`
  UserID     string `json:"user_id,omitempty"`
  SessionKey string `json:"session_key,omitempty"`
  CallbackURL string `json:"callback_url,omitempty"` // async webhook
}

type teamWakeResponse struct {
  TaskID  string `json:"task_id"`
  Status  string `json:"status"` // "pending" | "completed"
  Content string `json:"content,omitempty"` // if completed synchronously
}
```

#### C. Webhook Callback (Async Pattern)

```go
// Pattern: trigger async + nhận kết quả qua webhook
// POST /v1/agents/{id}/wake
{
  "message": "Long running task...",
  "async": true,
  "callback_url": "https://your-app.com/webhook/goclaw",
  "callback_secret": "hmac-secret-for-verification"
}

// Response ngay lập tức:
{"run_id": "uuid", "status": "pending"}

// Sau khi hoàn thành, GoClaw POST tới callback_url:
{
  "run_id": "uuid",
  "status": "completed",
  "content": "...",
  "usage": {...},
  "timestamp": "2026-05-22T10:00:00Z",
  "signature": "hmac-sha256-signature"  // verify với callback_secret
}
```

**Backend cần**:
```sql
-- Bảng mới cho async runs
CREATE TABLE async_runs (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  session_key VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  callback_url TEXT,
  callback_secret TEXT,
  result_content TEXT,
  result_usage JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  tenant_id UUID
);
```

#### D. Embed Chat Widget (JS Snippet)

Cho phép nhúng chat widget vào website bất kỳ:

```html
<!-- Nhúng vào website bên ngoài -->
<script>
  window.GoClawConfig = {
    gatewayUrl: 'https://your-goclaw.com',
    apiKey: 'gck_public_readonly_key',
    agentKey: 'your-agent-key',
    userId: 'visitor-' + Math.random().toString(36).slice(2),
    theme: 'dark',
    position: 'bottom-right',
    greeting: 'Hi! How can I help you today?'
  };
</script>
<script src="https://your-goclaw.com/embed/widget.js" async></script>
```

**Widget UI (bubble + chat window)**:
```
                              ┌──────────────────────┐
                              │ 🤖 Claude Assistant   │
                              │ ─────────────────────│
                              │ Hi! How can I help?  │
                              │                      │
                              │ [User message...]    │
                              │ [Agent response...]  │
                              │                      │
                              │ [Type a message...] →│
                              └──────────────────────┘
                                                 [💬]
```

**Cần build**:
1. `widget.js` — standalone JS bundle (không dependencies)
2. Widget UI component (Shadow DOM để tránh CSS conflicts)
3. API key scope mới: `embed.chat` (chỉ cho phép chat, không có admin access)
4. Rate limiting per-domain/per-visitor

#### E. Official SDK (TypeScript + Python)

**TypeScript SDK** (`@goclaw/sdk`):

```typescript
import { GoClawClient } from '@goclaw/sdk';

const client = new GoClawClient({
  baseUrl: 'https://your-goclaw.com',
  apiKey: 'gck_your_key'
});

// Simple chat
const response = await client.agents.chat({
  agentKey: 'my-agent',
  message: 'Hello!',
  userId: 'user-123'
});

// Streaming
const stream = await client.agents.stream({
  agentKey: 'my-agent',
  message: 'Write a long essay...',
  userId: 'user-123'
});
for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}

// Team task
const task = await client.teams.createTask({
  teamId: 'team-uuid',
  subject: 'Research AI trends',
  description: 'Analyze the latest AI papers...'
});

// Webhook listener (Express)
app.post('/webhook/goclaw', client.webhooks.verify('my-secret'), (req, res) => {
  console.log('Run completed:', req.body.content);
  res.sendStatus(200);
});
```

**Python SDK** (`goclaw-sdk`):
```python
from goclaw import GoClawClient

client = GoClawClient(base_url="https://your-goclaw.com", api_key="gck_...")

# Simple
response = client.agents.chat(agent_key="my-agent", message="Hello!", user_id="user-123")

# Streaming
for chunk in client.agents.stream(agent_key="my-agent", message="Write a long essay..."):
    print(chunk.content, end="", flush=True)
```

### 4.6 Integration Examples — Tích hợp thực tế

#### n8n Node (webhook trigger → agent → kết quả)
```
[Webhook Trigger] → [HTTP Request: POST /v1/agents/uuid/wake] → [Respond to Webhook]
```

#### Zapier Action
- Trigger: "New email received"
- Action: "Ask GoClaw agent" (HTTP POST to wake API)
- Action: "Create response email" với content từ agent

#### Make.com (Integromat)
- Module GoClaw Chat: nhận message, trả về response

#### Python script + GoClaw
```python
# Automation script: process CSV với AI
import csv, goclaw

client = goclaw.Client(api_key="gck_...")

with open('data.csv') as f:
  for row in csv.DictReader(f):
    result = client.agents.chat(
      agent_key="data-analyst",
      message=f"Analyze: {row}",
      user_id="batch-job"
    )
    print(result.content)
```

### 4.7 Security Considerations cho External API

| Concern | Giải pháp |
|---|---|
| API key exposure trong embed widget | Tạo scope `embed.chat` (chỉ chat, không admin) |
| Rate limiting | Per API key + per user_id + per domain (referer check) |
| CORS cho widget | Whitelist allowed_origins trong system_config |
| Webhook verification | HMAC-SHA256 signature trên mọi callback |
| Session isolation | Mỗi visitor_id tạo session riêng, không thể cross-access |
| Cost control | Per-key budget limit (USD/month) |

### 4.8 Implementation Priority

**Ngay lập tức (đã có, chỉ cần document)**:
- [ ] Viết documentation đầy đủ cho `/v1/chat/completions`
- [ ] Viết documentation + examples cho `/v1/agents/{id}/wake`
- [ ] Viết WebSocket client examples (JS, Python, Go)

**Short-term (2-3 tuần)**:
- [ ] Streaming wake (`?stream=true`) với SSE
- [ ] Team wake API (`/v1/teams/{id}/wake`)
- [ ] TypeScript SDK package

**Medium-term (1-2 tháng)**:
- [ ] Async wake + webhook callback system
- [ ] Embed chat widget (`widget.js`)
- [ ] Python SDK

**Long-term**:
- [ ] Official Zapier/n8n integration apps
- [ ] OpenAPI spec hoàn chỉnh (đã có `openapi_spec.json`, cần update)

---

## Tóm Tắt Effort & Priority

| Chủ đề | Effort | Priority | Backend work | Frontend work |
|---|---|---|---|---|
| **Chat Upgrade (LobeHub)** | 2 tuần | P0 | Nhỏ (thêm archive, search) | Lớn (model picker, rename, actions) |
| **Branding Admin** | 1 tuần | P1 | Nhỏ (thêm keys + endpoint) | Trung bình (UI page + provider) |
| **Theme System** | 1 tuần | P1 | Rất nhỏ (system_config key) | Trung bình (CSS + switcher UI) |
| **External API** | 3+ tuần | P2 | Lớn (streaming, webhook, SDK) | Nhỏ (widget) |

### Recommended Sprint Order

```
Sprint 1 (tuần 1-2):
  → Chat: Model picker + Session rename + Archive + Search

Sprint 2 (tuần 3):
  → Branding: Backend keys + /v1/branding + Admin UI page

Sprint 3 (tuần 4):
  → Theme: 5 color schemes + Admin theme switcher

Sprint 4-6 (tuần 5-8):
  → External API: Streaming wake + Team API + TypeScript SDK

Sprint 7+ (future):
  → Embed widget + Python SDK + Zapier integration
```

---

## Phụ lục: GoClaw External API Quick Reference

### Authentication
```
Authorization: Bearer gck_your_api_key_here
X-GoClaw-User-Id: user-123        (optional, bind session to user)
X-GoClaw-Agent-Id: agent-uuid    (optional, target specific agent)
X-GoClaw-Tenant-Id: tenant-slug  (optional, for multi-tenant)
```

### Endpoints có sẵn ngay

| Endpoint | Dùng cho |
|---|---|
| `POST /v1/chat/completions` | OpenAI-compatible, stream=true/false |
| `POST /v1/agents/{id}/wake` | Sync HTTP trigger, JSON response |
| `GET /ws` | WebSocket streaming |
| `POST /v1/responses` | OpenAI Responses protocol |
| `GET /v1/agents` | List agents |
| `GET /v1/agents/{id}` | Agent detail |
| `GET /health` | Health check |
