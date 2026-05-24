# GoClaw Mobile — Ideas & Enhancements Backlog

> Tạo ngày: 24/05/2026. Cập nhật sau mỗi sprint fix.

---

## 🔥 High Priority (UX tác động lớn)

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
| Agents | ✅ | ⚠️ | ✅ | ✅ | Create form incomplete |
| Dashboard | ✅ | — | — | — | Fixed period re-fetch |
| Monitor | ✅ | — | ✅ | ✅ | OK |
| Traces | ✅ | — | — | ✅ | Detail screen missing |
| Skills | ✅ | — | — | ✅ | OK |
| Approvals | ✅ | — | ✅ | — | OK |
| Sessions | ✅ | ✅ | ✅ | ✅ | OK |
| Memory | ❌→empty | — | ✅ | ✅ | API 404 |
| Channels | ❌→empty | ❌ + btn | ✅ | ✅ | + btn shows Alert only |
| Cron Jobs | ❌→empty | ❌ + btn | — | ✅ | + btn shows Alert only |
| MCP Servers | ❌→empty | ❌ + btn | — | ✅ | + btn shows Alert only |
| Events | ✅ live | — | ✅ | ✅ | OK (live WS) |
| Models | ✅ | — | — | ✅ | Missing ctx window info |
| Providers | ✅ | — | — | — | OK |
| Voice/TTS | ⚠️ | — | — | — | Playback bugs |
| Search | ❌ | — | — | — | Broken |
| Vault | ❌ demo | — | — | — | API 404 |
| Teams | ❌ demo | — | — | — | API 404 |
| Knowledge Graph | ❌ | — | — | — | Static demo |
| Storage | ❌ demo | — | — | — | API 404 |
| Activity Log | ⚠️ | — | — | — | Limited |
| Health | ✅ | — | — | — | OK |
| Contacts | ✅ | — | — | — | Verify schema |
| Packages | ❌ demo | — | — | — | API 404 |

Legend: ✅ Working | ⚠️ Partial | ❌ Not working/demo
