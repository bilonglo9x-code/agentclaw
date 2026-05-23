# Kế hoạch cập nhật OTA cho GoClaw Mobile

## Tổng quan

Hệ thống cho phép admin nhận thông báo và cập nhật app mobile trực tiếp từ repo mà không cần qua App Store.

---

## Hướng A — Expo EAS Update (OTA)

### Cách hoạt động

```
Developer (Replit) → eas update --channel production
    ↓
Expo Update Server lưu JS bundle mới
    ↓
App khởi động → gọi expo-updates API kiểm tra → có bản mới
    ↓
Hiện banner "Bản cập nhật X.Y sẵn sàng" → user bấm → restart app
```

### Những gì cập nhật được qua OTA

| Loại thay đổi | OTA được không |
|---|---|
| Toàn bộ code React Native / UI | ✅ |
| Logic, hooks, screens mới | ✅ |
| Thay đổi màu sắc, layout | ✅ |
| Native modules mới | ❌ |
| Thay đổi `app.json` / permissions | ❌ |

### Chi phí & điều kiện

- Cần tài khoản Expo EAS (có tier miễn phí)
- Cần build production APK/IPA một lần qua EAS Build
- Sau đó mọi update JS = miễn phí, không giới hạn

### Workflow thực tế với Replit

```bash
# Mỗi lần muốn push bản cập nhật mới
eas update --channel production --message "Fix: tenant screen + new features"
```

→ App của admin nhận được trong vòng vài phút.

### Checklist để bắt đầu

- [ ] Đăng ký / đăng nhập Expo EAS account
- [ ] `eas login` trong terminal
- [ ] Thêm `expo-updates` package vào app
- [ ] Cấu hình channel trong `app.json`
- [ ] `eas build --platform android --profile preview` — build lần đầu
- [ ] Thêm UI banner check update trong app
- [ ] Từ đó về sau: chỉ `eas update` mỗi khi muốn deploy

---

## Hướng B — Server Version Check

### Cách hoạt động

```
Backend expose: GET /v1/system/info
  → { version: "1.4.2", changelog: ["Fix X", "Add Y"], min_client: "1.3.0" }

App check khi login/khởi động
  → So sánh server version với version đang chạy
  → Nếu lớn hơn → hiện banner thông báo
```

### Phù hợp khi

- Muốn thông báo admin biết server backend đã được nâng cấp
- Thông báo breaking changes (cần update app để tương thích)
- Không cần thay đổi app client

### Giới hạn

"Cập nhật" ở đây là thông tin thôi — không tự cài app mới được, user vẫn phải vào App Store.

---

## So sánh & Khuyến nghị

| Tình huống | Nên chọn |
|---|---|
| App deploy trên App Store / Play Store | **A + B** |
| App chỉ dùng nội bộ / enterprise (APK trực tiếp) | **A** là đủ |
| Chỉ muốn thông báo admin khi server upgrade | **B** — đơn giản hơn |
| Chưa có EAS account, muốn thử nhanh | **B trước**, sau thêm A |

---

## UI Component — Banner thông báo cập nhật (thiết kế)

```
┌─────────────────────────────────────────────┐
│ 🔔  Bản cập nhật 1.4.2 sẵn sàng            │
│     • Thêm màn hình quản lý Tổ chức         │
│     • Cải thiện hiệu năng Dashboard         │
│                          [Bỏ qua] [Cập nhật]│
└─────────────────────────────────────────────┘
```

Vị trí hiển thị: top banner sau khi đăng nhập, hoặc trong màn hình More → mục Tài khoản.

---

## Ghi chú kỹ thuật

- WsClient hiện tại đã nhận `server.version` từ response `connect` → có thể dùng để so sánh phiên bản server ngay bây giờ mà không cần thêm endpoint mới
- `expo-updates` cần Expo SDK 49+ (project đang dùng Expo ~54 ✅)
- Channel nên chia: `development` / `staging` / `production` để kiểm soát rollout
