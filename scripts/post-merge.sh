#!/bin/bash
set -e

pnpm install --frozen-lockfile

# ── Sync-status helpers ───────────────────────────────────────────────────────
STATUS_FILE="scripts/sync-status.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HEAD_SHA=$(git rev-parse HEAD)
HEAD_SHORT=$(git rev-parse --short HEAD)

record_push() {
  local remote="$1"
  local result="$2"   # "success" | "failed" | "not_configured" | "skipped"
  local note="$3"

  node -e "
    const fs = require('fs');
    const existing = fs.existsSync('$STATUS_FILE') ? fs.readFileSync('$STATUS_FILE', 'utf8').trim() : '{}';
    const data = JSON.parse(existing || '{}');
    data['$remote'] = {
      lastAttempt: '$NOW',
      result: '$result',
      sha: '$HEAD_SHA',
      shortSha: '$HEAD_SHORT',
      note: '$note'
    };
    fs.writeFileSync('$STATUS_FILE', JSON.stringify(data, null, 2) + '\n');
  "
}

# Initialise the file so it always exists after this script runs
if [[ ! -f "$STATUS_FILE" ]]; then
  echo "{}" > "$STATUS_FILE"
fi

# ── Push to GitHub repos ──────────────────────────────────────────────────────
# Prefer GITHUB_TOKEN (injected credential) for authenticated pushes.
# Falls back to whatever credentials git already has configured.

push_remote() {
  local remote="$1"
  local url="$2"
  local label="$3"

  echo "Pushing to $label..."
  if git push "$url" HEAD:main --force-with-lease 2>&1 | grep -v "GITHUB_TOKEN"; then
    echo "✓ $label push succeeded ($HEAD_SHORT)"
    record_push "$remote" "success" "$label"
  else
    echo "WARNING: push to $label failed" >&2
    record_push "$remote" "failed" "$label — check credentials"
  fi
}

if [ -n "$GITHUB_TOKEN" ]; then
  # Authenticated push via token
  ORIGIN_URL="https://${GITHUB_TOKEN}@github.com/bilonglo9x-code/Agent-Claw-Plan.git"
  AGENTCLAW_URL="https://${GITHUB_TOKEN}@github.com/bilonglo9x-code/agentclaw.git"

  push_remote "origin"    "$ORIGIN_URL"    "origin (Agent-Claw-Plan)"
  push_remote "agentclaw" "$AGENTCLAW_URL" "agentclaw mirror"
else
  echo "INFO: GITHUB_TOKEN not set — falling back to configured remotes"

  if git remote get-url origin &>/dev/null; then
    push_remote "origin" "origin" "origin (Agent-Claw-Plan)"
  else
    echo "INFO: origin remote not configured — skipping"
    record_push "origin" "not_configured" "remote not in .git/config"
  fi

  if git remote get-url agentclaw &>/dev/null; then
    push_remote "agentclaw" "agentclaw" "agentclaw mirror"
  else
    echo "INFO: agentclaw remote not configured — skipping"
    record_push "agentclaw" "not_configured" "remote not in .git/config"
  fi
fi

# ── Print summary ─────────────────────────────────────────────────────────────
echo ""
echo "── Sync status ──────────────────────────────────────"
node -e "
  const data = JSON.parse(require('fs').readFileSync('$STATUS_FILE', 'utf8'));
  for (const [remote, info] of Object.entries(data)) {
    const icon = info.result === 'success' ? '✓' : info.result === 'not_configured' ? '○' : '✗';
    console.log(icon + ' ' + remote.padEnd(12) + ' ' + info.result.padEnd(16) + info.lastAttempt + '  ' + (info.shortSha || ''));
  }
"
echo "─────────────────────────────────────────────────────"
