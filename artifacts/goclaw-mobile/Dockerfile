# ── Stage 1: Build Expo web ──────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /workspace

# Copy workspace config files first (for better layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy only the packages needed for goclaw-mobile
COPY lib/api-client-react/ ./lib/api-client-react/
COPY artifacts/goclaw-mobile/ ./artifacts/goclaw-mobile/

# Install dependencies (workspace context, Linux x64 binaries)
RUN pnpm install --frozen-lockfile --filter "@workspace/goclaw-mobile..." 2>/dev/null || \
    pnpm install --frozen-lockfile

ARG EXPO_ROUTER_ORIGIN=https://mobile.vnsi.app

WORKDIR /workspace/artifacts/goclaw-mobile

# Build Expo web static output
RUN EXPO_ROUTER_ORIGIN=${EXPO_ROUTER_ORIGIN} \
    npx expo export --platform web --output-dir /dist 2>&1

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runtime

RUN apk add --no-cache netcat-openbsd

COPY --from=builder /dist /usr/share/nginx/html

# SPA routing: fallback all routes to index.html
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
