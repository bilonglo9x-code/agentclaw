# GoClaw — Coolify Deployment Guide

## Yêu cầu
- Coolify instance đang chạy
- Một server/VPS với Docker

## Bước 1: Chuẩn bị secrets

```bash
# Tạo secrets ngẫu nhiên
openssl rand -hex 32   # dùng cho GOCLAW_GATEWAY_TOKEN
openssl rand -hex 32   # dùng cho GOCLAW_ENCRYPTION_KEY
openssl rand -hex 16   # dùng cho POSTGRES_PASSWORD
```

## Bước 2: Tạo project trong Coolify

1. Vào Coolify → **New Project**
2. Chọn **Docker Compose**
3. Source: **GitHub** → chọn repo này
4. Docker Compose file: `deploy/docker-compose.coolify.yml`

## Bước 3: Set Environment Variables

Trong Coolify project settings, thêm các biến:

| Variable | Giá trị |
|---|---|
| `POSTGRES_PASSWORD` | (strong random) |
| `GOCLAW_GATEWAY_TOKEN` | (openssl rand -hex 32) |
| `GOCLAW_ENCRYPTION_KEY` | (openssl rand -hex 32) |
| `POSTGRES_USER` | `goclaw` |
| `POSTGRES_DB` | `goclaw` |
| `GOCLAW_PORT` | `18790` |

## Bước 4: Deploy

1. Coolify → **Deploy**
2. Đợi healthcheck xanh
3. Truy cập: `https://<your-domain>:18790`

## Bước 5: Cấu hình GoClaw lần đầu

1. Mở trình duyệt → `https://<your-domain>:18790`
2. Tạo tài khoản admin
3. Vào **Settings → Providers** → thêm LLM API keys
4. Vào **Settings → Agents** → tạo agent đầu tiên

## Kết nối Mobile App

Trong mobile app (GoClaw Mobile):
1. Nhấn icon cloud ở header
2. Server URL: `https://<your-domain>:18790`
3. API Token: tạo trong **Settings → API Keys** của web UI

## Cập nhật

```bash
# Pull image mới nhất và restart
docker compose -f deploy/docker-compose.coolify.yml pull
docker compose -f deploy/docker-compose.coolify.yml up -d
```

Hoặc trong Coolify: nhấn **Redeploy**.

## Image variants

| Tag | Mô tả |
|---|---|
| `latest` | Backend + web UI + Python (recommended) |
| `latest-base` | API only, không có web UI |
| `latest-full` | Tất cả runtimes + skill dependencies |
