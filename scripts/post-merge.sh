#!/bin/bash
set -e

pnpm install --frozen-lockfile

# Push to GitHub repos using GITHUB_TOKEN if available.
# Pushes to both: origin (Agent-Claw-Plan) and agentclaw mirror.
if [ -z "$GITHUB_TOKEN" ]; then
  echo "INFO: GITHUB_TOKEN not set — skipping GitHub sync"
  exit 0
fi

ORIGIN_URL="https://${GITHUB_TOKEN}@github.com/bilonglo9x-code/Agent-Claw-Plan.git"
AGENTCLAW_URL="https://${GITHUB_TOKEN}@github.com/bilonglo9x-code/agentclaw.git"

echo "Pushing to origin (Agent-Claw-Plan)..."
git push "$ORIGIN_URL" HEAD:main --force 2>&1 | grep -v "GITHUB_TOKEN" || {
  echo "WARNING: push to Agent-Claw-Plan failed" >&2
}

echo "Pushing to agentclaw mirror..."
git push "$AGENTCLAW_URL" HEAD:main --force 2>&1 | grep -v "GITHUB_TOKEN" || {
  echo "WARNING: push to agentclaw failed" >&2
}

echo "GitHub sync complete."
