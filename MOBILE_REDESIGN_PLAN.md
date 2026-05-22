# GoClaw — Mobile Redesign Plan

> **Chiến lược**: PWA trước (ra nhanh, 2–3 tuần) → React Native Expo sau (app store, 6–8 tuần)  
> **Nguyên tắc**: Shared business logic, chia sẻ tối đa code giữa web và native.

---

## Mục lục

1. [Phân tích hiện trạng](#1-phân-tích-hiện-trạng)
2. [Phase 1 — PWA Mobile-First Upgrade](#2-phase-1--pwa-mobile-first-upgrade)
3. [Phase 2 — React Native Expo App](#3-phase-2--react-native-expo-app)
4. [Shared Architecture — Code dùng chung](#4-shared-architecture--code-dùng-chung)
5. [Design System Mobile](#5-design-system-mobile)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Timeline & Sprint Plan](#7-timeline--sprint-plan)

---

## 1. Phân tích hiện trạng

### 1.1 Những gì đang tệ

| Vấn đề | Impact | Root cause |
|---|---|---|
| 30+ nav items trong hamburger drawer | ❌ Cực tệ | Sidebar desktop clone lên mobile |
| Sidebar overlay che hết content | ❌ Tệ | Không có mobile-specific layout |
| Chat layout: 3 cột desktop → 1 cột nhỏ | ❌ Tệ | Chưa có mobile-first chat layout |
| Table-heavy pages (Agents, Sessions, Traces) | ❌ Tệ | Desktop data density |
| Không có PWA (manifest, service worker) | ⚠️ Vừa | Chưa implement |
| Không có touch gestures | ⚠️ Vừa | Chưa implement |
| Font size 14px trên mobile → iOS auto-zoom | ⚠️ Vừa | Cần 16px cho input |
| Topbar chiếm 56px cho navigation | ⚠️ Vừa | Lãng phí vertical space |

### 1.2 Những gì đã tốt (giữ nguyên)

- `useIsMobile()` / `useIsTablet()` hooks ✅
- `safe-area-inset-*` CSS utilities ✅  
- Virtual keyboard handler (`--keyboard-height`) ✅
- `landscape-compact` mode ✅
- WebSocket + real-time events ✅
- i18n (vi/en/zh) ✅
- Dark/light mode ✅

### 1.3 Navigation hiện tại vs đề xuất

```
HIỆN TẠI (mobile):                    MỚI (PWA + Native):
─────────────────────────              ──────────────────────────────
[≡] GoClaw          [settings]        [No topbar trên Chat/Home]
─────────────────────────
                                       ┌─ Fullscreen content area ─┐
  Content area                         │                            │
  (bị topbar chiếm 56px)               │  (header nhỏ per-page)    │
                                       │                            │
─────────────────────────              └────────────────────────────┘
                                       [💬][🤖][📊][📡][⋯]
                                        ← Bottom Tab Bar →
```

---

## 2. Phase 1 — PWA Mobile-First Upgrade

**Mục tiêu**: Biến web app hiện tại thành PWA cài được + trải nghiệm mobile tốt.  
**Thời gian**: 2–3 tuần  
**Stack**: React + Tailwind (giữ nguyên), thêm Vite PWA plugin

### 2.1 Bottom Tab Navigation — Thay toàn bộ hamburger

#### Thiết kế 5 tabs

| Tab | Icon | Route | Badge |
|---|---|---|---|
| **Chat** | `MessageSquare` | `/chat` | Active session indicator |
| **Agents** | `Bot` | `/agents` | |
| **Dashboard** | `LayoutDashboard` | `/overview` | Alert count |
| **Monitor** | `Activity` | `/traces` | |
| **More** | `MoreHorizontal` | — | Opens bottom sheet |

#### Implementation: `MobileTabBar` component

```tsx
// ui/web/src/components/layout/mobile-tab-bar.tsx
export function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const alertCount = useAlertCount(); // từ bgalert store

  const tabs = [
    { id: "chat",      icon: MessageSquare, label: "Chat",      path: ROUTES.CHAT },
    { id: "agents",    icon: Bot,           label: "Agents",    path: ROUTES.AGENTS },
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: ROUTES.OVERVIEW, badge: alertCount },
    { id: "monitor",   icon: Activity,      label: "Monitor",   path: ROUTES.TRACES },
    { id: "more",      icon: MoreHorizontal, label: "More",     path: null }, // opens sheet
  ];

  return (
    <nav className="safe-bottom border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} active={isActive(location, tab.path)} />
        ))}
      </div>
    </nav>
  );
}
```

#### `AppLayout` mobile — loại bỏ topbar trên mobile

```tsx
// AppLayout phân biệt mobile vs desktop:
return (
  <div className="flex h-dvh overflow-hidden safe-top">
    {/* Desktop only: sidebar */}
    {!isMobile && <Sidebar collapsed={sidebarCollapsed} />}

    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Desktop only: topbar */}
      {!isMobile && <Topbar ... />}

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile only: bottom tab bar */}
      {isMobile && <MobileTabBar />}
    </div>
  </div>
);
```

#### "More" Bottom Sheet — 30+ items còn lại

```tsx
// Khi tap More tab → hiện bottom sheet với full nav
<BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)}>
  <div className="px-4 py-2">
    {/* Profile card */}
    <ProfileCard compact />

    {/* Grouped nav */}
    <NavGroup title="Tính năng">
      <NavSheetItem to={ROUTES.SKILLS}   icon={Zap}   label="Skills" />
      <NavSheetItem to={ROUTES.CHANNELS} icon={Radio} label="Channels" />
      <NavSheetItem to={ROUTES.CRON}     icon={Clock} label="Cron Jobs" />
      ...
    </NavGroup>

    <NavGroup title="Dữ liệu">
      <NavSheetItem to={ROUTES.MEMORY}  icon={Brain}   label="Memory" />
      <NavSheetItem to={ROUTES.VAULT}   icon={FileArchive} label="Vault" />
      ...
    </NavGroup>

    {isAdmin && (
      <NavGroup title="Admin">
        <NavSheetItem to={ROUTES.PROVIDERS} icon={Cpu}     label="Providers" />
        <NavSheetItem to={ROUTES.API_KEYS}  icon={KeyRound} label="API Keys" />
        ...
      </NavGroup>
    )}
  </div>
</BottomSheet>
```

### 2.2 Chat Page — Mobile-First Redesign

#### Vấn đề hiện tại
- Mobile chat vẫn render `ChatSidebar` (w-72) nhưng ẩn đi — lãng phí DOM
- Không có session picker native-feeling
- Input bar không account đúng safe-area + keyboard

#### Mobile Chat Layout mới

```
┌──────────────────────────────────────────┐
│ [← Back]  🤖 Sales Agent  [claude-s ▾] [⋯] │  ← compact header (44px)
├──────────────────────────────────────────┤
│                                          │
│   Messages thread (fullscreen)           │
│                                          │
│   [Agent bubble]                         │
│   [User bubble]                          │
│                                          │
├──────────────────────────────────────────┤
│ 📎 🎤 📷          context: 12%  [🛑]    │  ← toolbar row
│ ┌──────────────────────────────────┐[↑] │
│ │ Nhập tin nhắn...                 │    │  ← input
│ └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
     [💬][🤖][📊][📡][⋯]                    ← tab bar (ẩn khi keyboard open)
```

**Key changes**:
```tsx
// chat-page.tsx — mobile branch
if (isMobile) {
  return (
    <div className="flex h-full flex-col">
      {/* Compact header thay vì ChatTopBar cũ */}
      <MobileChatHeader
        agentId={agentId}
        session={session}
        onBack={() => navigate(ROUTES.CHAT)} // back to session list
        onMenuOpen={() => setChatMenuOpen(true)}
      />

      {/* Thread — full height */}
      <ChatThread className="flex-1" messages={messages} ... />

      {/* Sticky input — hide when keyboard causes layout shift */}
      <MobileChatInput
        onSend={handleSend}
        onAbort={handleAbort}
        isBusy={isBusy}
        files={files}
        onFilesChange={setFiles}
      />
    </div>
  );
}
```

#### Session list → trở thành trang riêng trên mobile

Hiện tại Chat page ẩn sidebar trên mobile → **tách thành 2 routes**:
```
/chat                    → Mobile: session list (chọn session)
/chat/:sessionKey        → Mobile: thread view (chat screen)
```

```tsx
// Mobile chat routing
if (isMobile && !sessionKey) {
  return <MobileChatSessionList agentId={agentId} />;
}
```

#### Quick Model Switcher (LobeHub pattern)

```tsx
// Trong MobileChatHeader
<button
  onClick={() => setModelPickerOpen(true)}
  className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1"
>
  <span className="text-xs text-muted-foreground">{currentModel}</span>
  <ChevronDown className="h-3 w-3 text-muted-foreground" />
</button>

// Bottom sheet với model list
<BottomSheet open={modelPickerOpen}>
  <ModelPicker
    agentId={agentId}
    currentProvider={provider}
    currentModel={model}
    onSelect={(provider, model) => {
      // Call WS: user_agent_overrides upsert
      ws.call(Methods.AGENTS_SET_USER_OVERRIDE, { agentId, provider, model });
    }}
  />
</BottomSheet>
```

### 2.3 Agents Page — Card Grid Mobile

```tsx
// Mobile: 2-column grid thay vì list/card page với AgentDetailPage bên phải
if (isMobile) {
  // Nếu đang xem detail → full screen detail
  if (detailId) return <AgentDetailPage id={detailId} mobile />;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky search + filter */}
      <div className="sticky top-0 z-10 bg-background px-3 py-3 space-y-2 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Agents</h1>
          <FAB onClick={() => setCreateOpen(true)} />
        </div>
        <SearchInput ... />
        <FilterChips filters={["Tất cả", "Agent", "Team", "Active"]} />
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {pageItems.map(agent => (
          <MobileAgentCard key={agent.id} agent={agent}
            onChat={() => navigate(`/chat?agent=${agent.agent_key}`)}
            onDetail={() => navigate(`/agents/${agent.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 2.4 Dashboard/Overview — Mobile-First

```tsx
// Hiện tại: nhiều cards + tabs (Usage, Health, ...)
// Mobile version: scrollable feed thay vì multi-column grid

<div className="space-y-4 px-4 py-4">
  {/* Alert banner — luôn đầu tiên */}
  {alerts.map(a => <AlertBanner key={a.id} alert={a} />)}

  {/* Stat cards — 2x2 grid */}
  <StatGrid stats={[requests, tokens, activeAgents, costToday]} />

  {/* Sparkline */}
  <RequestChart period="7d" />

  {/* Recent activity feed */}
  <ActivityFeed limit={10} />

  {/* Quick action grid */}
  <QuickActions items={[traces, events, logs]} />
</div>
```

### 2.5 PWA Manifest + Service Worker

#### `public/manifest.json`
```json
{
  "name": "GoClaw",
  "short_name": "GoClaw",
  "description": "Multi-tenant AI Agent Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Chat", "url": "/chat", "icons": [{"src": "/icons/chat-96.png", "sizes": "96x96"}] },
    { "name": "Agents", "url": "/agents", "icons": [{"src": "/icons/agents-96.png", "sizes": "96x96"}] }
  ]
}
```

#### Vite PWA Plugin
```typescript
// vite.config.ts — thêm vite-plugin-pwa
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Network-first cho API calls (WebSocket bỏ qua)
        runtimeCaching: [
          { urlPattern: /^\/v1\//, handler: 'NetworkFirst' }
        ]
      },
      manifest: { /* ... từ manifest.json */ }
    })
  ]
});
```

### 2.6 Interaction Patterns — Mobile UX

#### Swipe Gestures
```tsx
// Session list: swipe-left để archive/delete
<SwipeableRow
  rightActions={[
    { icon: Archive, label: "Archive", color: "blue", onAction: () => archiveSession(key) },
    { icon: Trash2, label: "Delete", color: "red", onAction: () => deleteSession(key) },
  ]}
>
  <SessionItem session={session} />
</SwipeableRow>
```

#### Pull to Refresh
```tsx
// Trên các list pages (agents, sessions, etc.)
<PullToRefresh onRefresh={async () => { await refresh(); }}>
  <AgentList agents={agents} />
</PullToRefresh>
```

#### Bottom Sheet component
```tsx
// Dùng cho: model picker, more menu, agent quick actions, share
// Library: vaul (by emilkowalski) — đã dùng trong nhiều React projects
// Hoặc custom implementation với Radix Dialog + CSS transforms

import { Drawer } from 'vaul';

<Drawer.Root open={open} onClose={onClose}>
  <Drawer.Overlay className="fixed inset-0 bg-black/60" />
  <Drawer.Content className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-background safe-bottom">
    <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted" /> {/* drag handle */}
    {children}
  </Drawer.Content>
</Drawer.Root>
```

### 2.7 PWA Phase — Danh sách files cần sửa

| File | Việc cần làm |
|---|---|
| `components/layout/app-layout.tsx` | Thêm mobile branch: không sidebar, không topbar, có tab bar |
| `components/layout/mobile-tab-bar.tsx` | **Tạo mới** — Bottom tab navigation |
| `components/layout/more-bottom-sheet.tsx` | **Tạo mới** — "More" slide-up menu |
| `pages/chat/chat-page.tsx` | Mobile branch: session list → thread view routing |
| `pages/chat/mobile-chat-header.tsx` | **Tạo mới** — Compact header với model picker |
| `pages/chat/mobile-session-list.tsx` | **Tạo mới** — Session list with swipe gestures |
| `pages/agents/agents-page.tsx` | Mobile: 2-column card grid |
| `pages/agents/mobile-agent-card.tsx` | **Tạo mới** — Compact agent card |
| `pages/overview/overview-page.tsx` | Mobile: scrollable feed layout |
| `components/shared/bottom-sheet.tsx` | **Tạo mới** — Reusable bottom sheet |
| `components/shared/swipeable-row.tsx` | **Tạo mới** — Swipe gesture |
| `components/shared/pull-to-refresh.tsx` | **Tạo mới** — Pull to refresh |
| `components/chat/model-picker.tsx` | **Tạo mới** — Quick model switcher |
| `index.html` | Thêm manifest link, apple-touch-icon, theme-color |
| `public/manifest.json` | **Tạo mới** |
| `public/icons/` | **Tạo mới** — PWA icons 192, 512 |
| `vite.config.ts` | Thêm vite-plugin-pwa |
| `index.css` | Thêm mobile-specific utilities |

---

## 3. Phase 2 — React Native Expo App

**Mục tiêu**: App native iOS + Android, publish App Store / Google Play  
**Thời gian**: 6–8 tuần sau Phase 1  
**Stack**: Expo SDK 52+, React Native, NativeWind (Tailwind cho RN)

### 3.1 Tại sao Expo?

- GoClaw đã có WebSocket protocol → React Native dùng được ngay
- Expo managed workflow → không cần Xcode/Android Studio để bắt đầu
- `expo-router` → file-based routing giống React Router
- Có thể share business logic (hooks, stores, API calls) với web
- EAS Build → CI/CD build cloud, không cần Mac để build iOS

### 3.2 Kiến trúc shared code

```
packages/
  goclaw-core/           ← SHARED business logic
    src/
      api/
        ws-client.ts     ← WebSocket client (works in both web + RN)
        protocol.ts      ← Protocol types
        methods.ts       ← Method constants
      stores/
        use-auth-store.ts    ← Zustand (web + RN)
        use-ui-store.ts
        use-chat-messages-store.ts
      hooks/
        use-ws.ts        ← WebSocket hook
        use-ws-call.ts
        use-agents.ts    ← Agent data fetching
        use-sessions.ts
      types/
        agent.ts
        session.ts
        chat.ts
      utils/
        session-key.ts
        format.ts
        error-utils.ts

ui/
  web/                   ← React (PWA) — hiện tại
  mobile/                ← React Native (Expo) — mới
    app/
      (tabs)/
        index.tsx        → Chat tab
        agents.tsx       → Agents tab
        dashboard.tsx    → Dashboard tab
        monitor.tsx      → Monitor tab
        more.tsx         → More tab
      chat/
        [sessionKey].tsx → Chat thread
      agents/
        [id].tsx         → Agent detail
    components/          ← RN-specific components
    constants/
    hooks/
```

### 3.3 Key screens — React Native

#### Tab Navigation (expo-router)
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { MessageSquare, Bot, LayoutDashboard, Activity, MoreHorizontal } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: '#09090b',
        borderTopColor: '#27272a',
      },
      tabBarActiveTintColor: '#e97232', // orange primary
      tabBarInactiveTintColor: '#71717a',
      headerShown: false, // per-screen headers
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Chat',
        tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} />,
      }} />
      <Tabs.Screen name="agents" options={{
        title: 'Agents',
        tabBarIcon: ({ color }) => <Bot size={22} color={color} />,
      }} />
      <Tabs.Screen name="dashboard" options={{
        title: 'Dashboard',
        tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
      }} />
      <Tabs.Screen name="monitor" options={{
        title: 'Monitor',
        tabBarIcon: ({ color }) => <Activity size={22} color={color} />,
      }} />
      <Tabs.Screen name="more" options={{
        title: 'More',
        tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} />,
      }} />
    </Tabs>
  );
}
```

#### Chat Screen (React Native)
```tsx
// app/(tabs)/index.tsx — Chat tab = session list
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChatTab() {
  const router = useRouter();
  const { sessions, loading } = useSessions();

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-zinc-800">
        <Text className="text-xl font-bold text-white">Conversations</Text>
        <TouchableOpacity onPress={() => router.push('/chat/new')}>
          <PlusIcon size={24} color="#e97232" />
        </TouchableOpacity>
      </View>

      {/* Agent selector chips */}
      <AgentChips onSelect={setSelectedAgent} selected={selectedAgent} />

      <FlatList
        data={sessions}
        keyExtractor={s => s.key}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => <SessionSwipeActions session={item} />}
          >
            <SessionRow
              session={item}
              onPress={() => router.push(`/chat/${item.key}`)}
            />
          </Swipeable>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      />
    </SafeAreaView>
  );
}
```

#### WebSocket trong React Native
```tsx
// packages/goclaw-core/src/api/ws-client.ts
// Platform-agnostic — dùng global WebSocket (có sẵn trong RN)
// Chỉ cần thay đổi base URL từ config

const wsUrl = Platform.OS === 'web'
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  : `wss://${config.gatewayHost}/ws`; // từ Expo SecureStore config
```

### 3.4 Native Features Expo cung cấp

| Feature | Expo Package | Dùng cho |
|---|---|---|
| Push notifications | `expo-notifications` | Agent completion, team task done |
| Secure storage | `expo-secure-store` | Lưu API key, gateway token |
| Camera | `expo-camera` | Attach ảnh vào chat |
| File picker | `expo-document-picker` | Upload file vào chat |
| Share | `expo-sharing` | Chia sẻ agent response |
| Haptics | `expo-haptics` | Feedback khi send, action |
| Audio | `expo-av` | TTS playback, voice recording |
| Background fetch | `expo-background-fetch` | Check new messages |
| Deep linking | `expo-linking` | `goclaw://chat/sessionKey` |

### 3.5 Push Notifications

```
Agent chạy xong (server side)
  → POST đến Expo Push Notification Service
  → iOS/Android nhận thông báo
  → Tap → deep link vào đúng session

Backend cần:
  ├── Bảng push_tokens (user_id, expo_token, platform, tenant_id)
  ├── Endpoint: POST /v1/push-tokens (register)
  ├── DELETE /v1/push-tokens/:token (unregister)
  └── Worker gửi notification khi run.completed
      (sử dụng Expo Push API: https://exp.host/--/api/v2/push/send)
```

### 3.6 EAS Build + Distribution

```bash
# Setup
npm install -g eas-cli
eas build:configure

# Development build (chạy trên device thật)
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all

# Submit to App Store + Google Play
eas submit --platform all
```

**EAS Update** — over-the-air updates (OTA):
```bash
# Deploy JS changes mà không cần rebuild app
eas update --branch production --message "Fix chat input bug"
```

### 3.7 App Store requirements

**iOS App Store**:
- Privacy manifest (`PrivacyInfo.xcprivacy`)
- Cần giải thích các APIs dùng: Camera, Microphone, Notifications
- Review time: 1-3 ngày

**Google Play**:
- Target API level 35+
- Cần Privacy Policy URL (xem branding module)
- Review time: vài giờ - 1 ngày

---

## 4. Shared Architecture — Code dùng chung

### 4.1 Packages structure

```
lib/
  goclaw-core/          ← New shared package
    package.json        { "name": "@workspace/goclaw-core" }
    src/
      api/protocol.ts   ← Đã có trong ui/web/src/api/protocol.ts → MOVE
      api/methods.ts    ← Đã có → MOVE
      stores/           ← Zustand stores (framework-agnostic) → MOVE
      hooks/            ← Data hooks không dùng React DOM → MOVE
      types/            ← TypeScript interfaces → MOVE
      utils/            ← Pure utility functions → MOVE
```

### 4.2 Migration strategy

**Week 1 (PWA phase)**:  
- Chưa cần tách ngay. PWA dùng code web hiện tại.
- Đánh dấu code nào có thể share (add comment `// @shareable`)

**Week 5 (đầu Native phase)**:  
- Extract `@workspace/goclaw-core` từ web code
- Web import từ `@workspace/goclaw-core` thay vì local
- Native import cùng package

### 4.3 Store sharing (Zustand — đã framework-agnostic)

```typescript
// @workspace/goclaw-core/src/stores/use-auth-store.ts
// Zustand không depend vào React DOM → dùng được trong cả web và RN
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// Platform-specific storage:
// Web: localStorage
// RN: expo-secure-store hoặc AsyncStorage

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      // ...
    }),
    {
      name: 'goclaw-auth',
      storage: createJSONStorage(() =>
        Platform.OS === 'web' ? localStorage : AsyncStorage
      ),
    }
  )
);
```

---

## 5. Design System Mobile

### 5.1 Spacing & Sizing

```
Touch targets:    min 44×44pt (iOS HIG)
Bottom tab:       h-16 (64px) + safe-area-inset-bottom
Chat input:       min-h-[44px], max-h-[160px]
Header:           h-11 (44px) compact / h-14 (56px) normal
Card padding:     12px (p-3)
Screen padding:   16px (px-4)
Section gap:      12px (gap-3)
```

### 5.2 Typography mobile

```css
/* Mobile: dùng 16px base để tránh iOS auto-zoom */
--mobile-input-font: 16px;      /* Input: 16px bắt buộc */
--mobile-body: 14px;            /* Body text */
--mobile-caption: 12px;         /* Captions, badges */
--mobile-heading: 20px;         /* Page titles */
```

### 5.3 Animation

```
Tab switch:       instant (< 16ms)
Bottom sheet:     spring animation, 300ms
Page transition:  slide-right 250ms (native feel)
Loading states:   skeleton shimmer (không spinner)
Pull to refresh:  elastic bounce
Swipe delete:     spring reveal
```

### 5.4 Breakpoints

```
Mobile:   ≤ 768px  → Bottom tab, mobile layouts
Tablet:   769-1024px → Sidebar collapsed by default, hybrid
Desktop:  > 1024px  → Full sidebar, desktop layouts
```

---

## 6. Interaction Patterns

### 6.1 Session management (Chat sidebar → mobile)

| Action | Desktop | Mobile PWA | Mobile Native |
|---|---|---|---|
| Xem sessions | Sidebar list | Full-screen list page | FlatList (virtualized) |
| Tạo session mới | Click "+ New Chat" | FAB button | FAB + haptic |
| Đổi tên session | Click context menu | Long-press → bottom sheet | Long-press → action sheet |
| Xoá session | Click context menu → confirm | Swipe-left → confirm | Swipe-left → haptic + confirm |
| Archive session | Không có | Swipe-left → archive | Swipe-left → archive |
| Pin session | Không có | Long-press → pin | Long-press → pin |
| Search sessions | Không có | Search bar on list page | Search bar |

### 6.2 Agent interactions

| Action | Desktop | Mobile |
|---|---|---|
| Xem agent detail | Right panel opens | Navigate to full screen |
| Edit agent | Detail page tabs | Bottom sheet (basic) / Full screen (advanced) |
| Quick chat | Click agent card | Tap card → go to chat |
| Model switch | Agent detail settings | Quick picker bottom sheet |

### 6.3 Navigation pattern

```
Mobile navigation stack:

Chat Tab:
  └── Session List (index)
      └── Chat Thread (/chat/:key)
          └── [Back → Session List]

Agents Tab:
  └── Agent Grid (index)
      └── Agent Detail (/agents/:id)
          └── Agent Edit (bottom sheet or /agents/:id/edit)

Dashboard Tab:
  └── Overview (index)
      └── Usage Detail (/usage) — push

Monitor Tab:
  └── Traces (index)
      └── Trace Detail (/traces/:id) — push

More Tab (bottom sheet):
  ├── Skills → push /skills
  ├── Channels → push /channels
  ├── Memory → push /memory
  ├── [Admin section]
  └── Settings → push /settings
```

---

## 7. Timeline & Sprint Plan

### Phase 1 — PWA (3 tuần)

**Sprint 1 (tuần 1): Navigation + Layout**
- [ ] `MobileTabBar` component
- [ ] `MoreBottomSheet` component  
- [ ] `AppLayout` mobile branch (no topbar, no sidebar, tab bar instead)
- [ ] `BottomSheet` reusable component (dùng `vaul`)
- [ ] `SwipeableRow` component
- [ ] `PullToRefresh` component
- [ ] Test trên Chrome mobile DevTools + Safari iOS

**Sprint 2 (tuần 2): Chat + Agents**
- [ ] Mobile chat header với quick model switcher
- [ ] Mobile session list (`/chat` route trên mobile)
- [ ] Session swipe gestures (archive, delete, pin)
- [ ] Agents 2-column card grid
- [ ] Agent detail → full screen trên mobile
- [ ] Mobile agent card component
- [ ] Filter chips cho agents page

**Sprint 3 (tuần 3): Dashboard + PWA**
- [ ] Dashboard mobile scrollable feed
- [ ] Alert banner component
- [ ] QuickActions grid
- [ ] Activity feed component
- [ ] `public/manifest.json` + icons (192, 512)
- [ ] `vite-plugin-pwa` setup + service worker
- [ ] Apple-specific meta tags (`apple-mobile-web-app-*`)
- [ ] Test install PWA trên iOS Safari + Chrome Android
- [ ] Smoke test tất cả mobile pages

### Phase 2 — React Native Expo (7 tuần)

**Sprint 4 (tuần 4–5): Foundation**
- [ ] Tạo `ui/mobile/` với Expo SDK 52
- [ ] Setup expo-router + tab navigation
- [ ] NativeWind config
- [ ] Extract `@workspace/goclaw-core` từ web
- [ ] WebSocket client platform-agnostic
- [ ] Auth store, connect flow
- [ ] Login screen

**Sprint 5 (tuần 6): Chat**
- [ ] Session list screen (FlatList + swipeable)
- [ ] Chat thread screen
- [ ] Message bubbles, tool call indicators
- [ ] Chat input (với keyboard handling native)
- [ ] Voice recording (expo-av)
- [ ] File attach (expo-document-picker)

**Sprint 6 (tuần 7): Agents + Dashboard**
- [ ] Agents grid screen
- [ ] Agent detail screen
- [ ] Model picker bottom sheet
- [ ] Dashboard screen
- [ ] Sparkline chart (Victory Native hoặc Skia)
- [ ] Activity feed

**Sprint 7 (tuần 8): Native Features + Polish**
- [ ] Push notifications setup (expo-notifications + backend)
- [ ] Deep linking (`goclaw://chat/...`)
- [ ] Haptic feedback
- [ ] Splash screen + app icon
- [ ] EAS Build config
- [ ] TestFlight beta (iOS) + Internal Testing (Android)

**Sprint 8 (tuần 9–10): App Store**
- [ ] Privacy manifest (iOS)
- [ ] Privacy Policy URL (cần branding module)
- [ ] Screenshot + metadata cho App Store
- [ ] App Store Connect submission
- [ ] Google Play Console submission
- [ ] Xử lý review feedback

### Tổng timeline

```
Tháng 1:   PWA Sprint 1-3 → PWA live
Tháng 2:   Expo Sprint 4-6 → Internal TestFlight beta
Tháng 3:   Expo Sprint 7-8 → Beta public
Tháng 3-4: App Store review + launch
```

---

## Phụ lục: Dependencies cần cài

### Phase 1 (PWA)
```bash
# ui/web
pnpm add --filter @workspace/web vaul          # Bottom sheet
pnpm add --filter @workspace/web vite-plugin-pwa  # PWA support
```

### Phase 2 (Expo)
```bash
# ui/mobile
npx create-expo-app@latest mobile --template blank-typescript
cd ui/mobile
npx expo install expo-router expo-secure-store expo-notifications
npx expo install expo-av expo-document-picker expo-camera
npx expo install expo-haptics expo-linking expo-constants
pnpm add nativewind zustand @tanstack/react-query
```

### @workspace/goclaw-core (shared)
```bash
# Tách từ web, không cần install thêm deps mới
# Đây là internal workspace package
```
