#!/usr/bin/env bash
# Install repo git hooks (pre-commit + AI trailer strip).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git config --unset-all core.hooksPath 2>/dev/null || true

if command -v pre-commit >/dev/null 2>&1; then
  pre-commit install -f --hook-type pre-commit --hook-type prepare-commit-msg
else
  echo "pre-commit not found — installing strip hook only into .git/hooks"
  mkdir -p .git/hooks
  cp scripts/git-hooks/prepare-commit-msg .git/hooks/prepare-commit-msg
  chmod +x .git/hooks/prepare-commit-msg
fi

echo "Git hooks ready (gitleaks + strip AI Co-authored-by)."
