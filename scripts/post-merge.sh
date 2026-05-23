#!/bin/bash
set -e

pnpm install --frozen-lockfile

# Push to agentclaw GitHub remote if it is configured.
# This syncs every merged change to the main code mirror automatically.
if git remote get-url agentclaw &>/dev/null; then
  echo "Pushing to agentclaw remote..."
  git push agentclaw HEAD:main --force-with-lease || {
    echo "WARNING: push to agentclaw remote failed (check credentials / remote URL)" >&2
  }
else
  echo "INFO: agentclaw remote not configured — skipping push to GitHub mirror"
fi
