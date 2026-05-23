#!/bin/bash
# check-sync.sh — Show GitHub remote sync status at a glance.
# Run any time: bash scripts/check-sync.sh

STATUS_FILE="scripts/sync-status.json"
HEAD_SHA=$(git rev-parse HEAD)
HEAD_SHORT=$(git rev-parse --short HEAD)

echo "── GoClaw GitHub Sync Status ────────────────────────────────"
echo "Local HEAD : $HEAD_SHORT  ($HEAD_SHA)"
echo ""

# ── Recorded history from sync-status.json (primary source) ─────
if [[ -f "$STATUS_FILE" ]]; then
  echo "── Last recorded push results (from post-merge) ─────────────"
  node -e "
    const data = JSON.parse(require('fs').readFileSync('$STATUS_FILE', 'utf8'));
    if (!Object.keys(data).length) { console.log('  (no pushes recorded yet)'); process.exit(0); }
    for (const [remote, info] of Object.entries(data)) {
      const icon = info.result === 'success' ? '✓' : info.result === 'not_configured' ? '○' : '✗';
      const sha  = (info.shortSha || '       ').padEnd(9);
      const age  = info.lastAttempt || '';
      const note = info.note ? '  [' + info.note + ']' : '';
      console.log('  ' + icon + ' ' + remote.padEnd(12) + info.result.padEnd(18) + sha + age + note);
    }
  "
else
  echo "  (sync-status.json not found — post-merge script has not run yet)"
fi

echo ""

# ── Configured remotes ───────────────────────────────────────────
echo "── Configured remotes ───────────────────────────────────────"
for remote in origin agentclaw; do
  if git remote get-url "$remote" &>/dev/null; then
    url=$(git remote get-url "$remote")
    printf "  ✓ %-12s  %s\n" "$remote" "$url"
  else
    printf "  ○ %-12s  not configured\n" "$remote"
  fi
done

echo "─────────────────────────────────────────────────────────────"
echo "Tip: run 'bash scripts/post-merge.sh' to push and refresh status."
