# GoClaw Mobile — Ideas & Enhancements Backlog

> Tạo ngày: 24/05/2026. Cập nhật sau mỗi sprint fix.

---

## � Sprint 4 Plan — Audit 24/05/2026

### Bugs cần fix ngay

| # | Vấn đề | File | Ghi chú |
|---|--------|------|---------|
| B1 | Agent name lowercase trong Conversation List | `index.tsx:152` | `s.agentName` chưa capitalize, cần lookup `agents.display_name` |
| B2 | Chats screen thiếu pull-to-refresh | `index.tsx:217` | FlatList sessions không có `RefreshControl` |
| B3 | `MOCK_SESSIONS` dead code | `sessions.tsx:24-30` | Khai báo nhưng không dùng, gây nhầm lẫn |
| B4 | `MOCK_VOICES` dead code | `voice.tsx:29-40` | Tương tự, xóa ngay |
| B5 | `MOCK_ACTIVITY` dead code | `dashboard.tsx:49-55` | Dead code, xóa ngay |
| B6 | `MOCK_SESSIONS` inputTokens/outputTokens | `sessions.tsx` | SessionInfo có field này nhưng real API không trả — cần graceful fallback |
| B7 | Onboarding screen tồn tại nhưng không auto-trigger | `_layout.tsx` | Không có logic check `isOnboarded()` khi app khởi động |
| B8 | Dashboard bar chart không tap được | `dashboard.tsx:362-381` | `View` thay vì `TouchableOpacity`, không có tooltip |
| B9 | Agent picker modal hiển thị agent key thay vì display name | `index.tsx:52` | `a.display_name ?? a.agent_key` — đúng nhưng chưa capitalize |

### Upgrades cần làm

| # | Feature | File | Chi tiết |
|---|---------|------|---------|
| U1 | Pull-to-refresh tất cả list screens | nhiều files | sessions, memory, monitor, skills, traces, approvals |
| U2 | Agent Create Form — system prompt editor full | `agent/create.tsx` | Hiện có `agent_description` nhưng thiếu skills/channel assignment section |
| U3 | Toast/Snackbar khi copy, delete, save | global | Thay Alert bằng toast nhẹ hơn |
| U4 | Dashboard chart bar tap → tooltip | `dashboard.tsx` | Tap bar → hiện popup với request count + date |
| U5 | Chats list — hiển thị unread badge | `index.tsx` | `unread` luôn = 0, cần subscribe WS events |
| U6 | Chat list — quick swipe to delete session | `index.tsx` | Swipe left → Delete action |
| U7 | Onboarding auto-trigger | `_layout.tsx` | Check `isOnboarded()` trên mount, redirect nếu false |
| U8 | Agent card — model + provider chip | `AgentCard.tsx` | Hiện chỉ có status dot + tên, thiếu model label |
| U9 | Sessions screen — inline rename | `sessions.tsx` | Hiện dùng Modal bottom sheet, cần inline edit |
| U10 | More screen — thêm Voice, Import/Export shortcuts | `more.tsx` | Shortcuts thiếu: voice, import-export, evolution |

### Bổ sung mới

| # | Feature | Priority | Chi tiết |
|---|---------|----------|---------|
| N1 | Global Toast/Snackbar system | High | Context + component hiển thị toast ở góc màn hình |
| N2 | Chat pinned messages | Medium | Long press → Pin message, hiển thị ở top chat |
| N3 | Agent favorite/bookmark | Medium | Tap ⭐ trên agent card → ghim lên top của list |
| N4 | Session export to file | Low | Export PDF hoặc .txt, share via iOS Files app |
| N5 | Offline mode indicator | Medium | Banner đỏ khi mất kết nối server |
| N6 | Chat draft save | Low | Lưu draft tin nhắn đang gõ vào AsyncStorage |
| N7 | Traces screen — agent filter chip | Medium | Filter traces theo agent name |
| N8 | Global keyboard shortcut (web) | Low | Cmd+K mở search, Cmd+N tạo chat mới |

---

---

## �🔥 High Priority (UX tác động lớn)

### 1. Push Notification Badge trên Tab Bar
- Badge số trên icon "More" khi có approval pending
- Badge đỏ trên icon "Chat" khi agent reply mới
- Nguồn: `useApprovals` đã có `pendingCount`, chỉ cần wire vào `<Tabs>` icon

### 2. Trace Detail Screen (Full)
- Hiện click vào trace card chỉ hiện Alert popup
- Cần screen đầy đủ: span tree, input/output preview, metadata, cost breakdown
- Route: `/traces/[id]` với `SpanTree` component

### 3. Agent Detail → Sessions Tab Clickable
- Tab Sessions trong `/agent/[id]` hiện list sessions nhưng tap không navigate
- Fix: `onPress={() => router.push('/chat/${session.key}')}`

### 4. Chat Input Auto-grow Height
- TextInput multiline không resize tự động trên web/PWA
- Text bị clip khi message > 2 dòng
- Fix: controlled height với `onContentSizeChange`

### 5. Onboarding Wizard (First-time User)
- Khi user mới (chưa có sessions), hiện wizard: connect server → chọn agent → chat đầu tiên
- Tăng activation rate đáng kể

---

## 🟡 Medium Priority (Feature completeness)

### 6. Quick Copy Message
- Long press trên bubble message → copy text
- Đặc biệt hữu ích trên mobile khi cần copy code/link từ agent

### 7. Voice Screen — TTS Playback Controls
- Play/pause/stop cho TTS output
- Volume slider
- Hiện screen chưa có playback state management

### 8. Knowledge Graph — Interactive Visualization
- `/knowledge-graph` hiện static, cần pan/zoom/tap-node
- Dùng `react-native-svg` + D3 force layout

### 9. Agent Create Form — Full Config
- `/agent/create` cần thêm: provider selection, system prompt editor, skill assignment, channel assignment

### 10. Session Rename & Delete Confirmation
- `/sessions` đã có edit icon nhưng rename flow qua Alert (không mobile-friendly)
- Cần inline edit hoặc bottom sheet

### 11. Trace Filters — Agent, Status, Date Range
- `/traces` chỉ có search text, thiếu filter by agent/status/date
- Agent filter đặc biệt hữu ích khi nhiều agents

### 12. Dashboard Requests Chart — Tap Bar for Detail
- Tap vào bar chart → hiện detail số cho ngày đó
- Hiện chart bars không có interaction

### 13. Storage Screen — File Browser
- `/storage` hiện demo data
- Cần real API: list files, preview image/text, delete

### 14. Contacts Screen — Real API
- `/contacts` trả về data nhưng chưa rõ schema
- Cần verify và wire đúng

### 15. Activity Log — Filter by Type/Agent
- `/activity` chưa có filter
- Cần filter: agent, event type, date range

---

## 🟢 Low Priority / Polish

### 16. Dark/Light Theme Toggle
- Hiện hardcode dark mode
- Thêm toggle trong Settings + respect system theme

### 17. Haptic Feedback Consistency
- Một số buttons có haptic, một số không
- Standardize: light haptic on tap, medium on destructive actions

### 18. Skeleton Loading States
- Hiện dùng `ActivityIndicator` spinner
- Nên dùng skeleton screens cho list items để UX mượt hơn

### 19. Pull-to-Refresh Consistency
- Một số screens có `RefreshControl`, một số không
- Standardize tất cả list screens

### 20. Error State với Retry Button
- Khi API fail, hiện text "Lỗi kết nối"
- Cần thêm nút "Thử lại" rõ ràng

### 21. Keyboard Dismiss on Scroll
- Khi scroll list trong Chat, keyboard không dismiss tự động
- Fix: `keyboardDismissMode="on-drag"` trên ScrollView/FlatList

### 22. Deep Link Support
- `goclaw://chat/[sessionKey]` mở trực tiếp vào session
- Hữu ích khi nhận notification

### 23. Share Session Transcript
- Button Share trong chat để export conversation
- Format: plain text hoặc markdown

### 24. Agent Status Badge Realtime
- Agent card trong `/agents` chưa update realtime khi status đổi
- Subscribe WS event `agent.status_changed`

### 25. Biometric Auth (FaceID/TouchID)
- Bảo vệ token bằng biometric khi mở app
- Dùng `expo-local-authentication`

---

## 📝 Module Audit Status

| Module | Real Data | Add/Edit | Delete | Search | Notes |
|--------|-----------|----------|--------|--------|-------|
| Chat | ✅ | ✅ | ✅ | ✅ | OK |
| Agents | ✅ | ✅ | ✅ | ✅ | Create form with auto-key |
| Dashboard | ✅ | — | — | — | Live events, real usage |
| Monitor | ✅ | — | ✅ | ✅ | Real logs only |
| Traces | ✅ | — | — | ✅ | ✅ Detail screen /traces/[id] |
| Skills | ✅ | — | — | ✅ | Real data only |
| Approvals | ✅ | — | ✅ | — | OK |
| Sessions | ✅ | ✅ | ✅ | ✅ | Real data only |
| Memory | ✅ | — | ✅ | ✅ | Real data |
| Channels | ✅ | ✅ modal | ✅ | ✅ | Create modal wired to WS |
| Cron Jobs | ✅ | ✅ modal | ✅ | ✅ | Create modal wired to WS |
| MCP Servers | ✅ | ✅ modal | ✅ | ✅ | Create modal wired to REST |
| Events | ✅ live | — | ✅ | ✅ | OK (live WS) |
| Models | ✅ | — | — | ✅ | Real data only |
| Providers | ✅ | — | — | — | Real data only |
| Voice/TTS | ✅ | — | — | — | Fixed args + audio playback |
| Search | ✅ | — | — | — | Fixed crash (conversations→sessions) |
| Vault | ✅ | — | ✅ | ✅ | Real data only |
| Teams | ✅ | ✅ modal | ✅ | ✅ | Real data, create modal |
| Knowledge Graph | ✅ | — | ✅ | ✅ | Per-agent, real API |
| Storage | ✅ | — | ✅ | ✅ | Real data, file browser |
| Activity Log | ✅ | — | — | ✅ | Real data only |
| Health | ✅ | — | — | — | Real data only |
| Contacts | ✅ | — | — | ✅ | Real data only |
| Packages | ✅ | ✅ install | — | ✅ | Real data only |
| API Keys | ✅ | ✅ create | ✅ revoke | ✅ | Real data |
| Devices | ✅ | ✅ pair | ✅ unpair | — | Real data |
| Tenants | ✅ | ✅ create | — | — | Real data, null-safe |
| Permissions | ✅ | ✅ grant | ✅ revoke | ✅ | Real data |
| TTS Config | ✅ | ✅ save | — | — | OK |
| Backup | ✅ | ✅ run | — | — | OK |
| Evolution | ✅ | — | — | ✅ | Per-agent |
| Vault Graph | ✅ | — | — | — | OK |

Legend: ✅ Working | ⚠️ Partial | ❌ Not working/demo
