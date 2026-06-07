#!/usr/bin/env bash
# Smart post-turn verification for Aviary Manager.
# Runs the TypeScript check when (and only when) there are uncommitted .ts/.tsx
# changes, and feeds any failure back to Claude so it gets fixed before the turn
# ends. Loop-safe: never re-blocks once it has already fired this turn.
set -uo pipefail

input="$(cat 2>/dev/null || true)"

# Loop guard: if this Stop was already triggered by us, don't block again.
case "$input" in
  *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Only verify when TypeScript files are actually dirty (staged or unstaged).
if ! git status --porcelain 2>/dev/null | grep -qE '\.(ts|tsx|mts|cts)$'; then
  exit 0
fi

out="$(npx tsc --noEmit 2>&1)"
status=$?
if [ "$status" -ne 0 ]; then
  {
    echo "Post-turn typecheck FAILED — fix these before finishing:"
    printf '%s\n' "$out" | tail -30
  } >&2
  exit 2   # exit 2 feeds stderr back to Claude and blocks stop until resolved
fi

exit 0
