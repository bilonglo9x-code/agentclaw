#!/bin/sh
set -e
echo "[wait-for-postgres] Waiting for postgres at 127.0.0.1:5432..."
until python3 -c "
import socket, sys
try:
    s = socket.create_connection(('127.0.0.1', 5432), timeout=1)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  echo "[wait-for-postgres] postgres not ready, retrying in 2s..."
  sleep 2
done
echo "[wait-for-postgres] postgres is ready — starting GoClaw"
exec /app/docker-entrypoint.sh "$@"
