#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd -P)"
REPO_ROOT="$(cd -- "${SKILL_ROOT}/../../.." && pwd -P)"

run() {
  printf '+ %s\n' "$*"
  "$@"
}

cd "${REPO_ROOT}"

run bash scripts/check-environment.sh
run bash scripts/codex-preflight.sh --stack auto --mode optional
run bash scripts/verify-work.sh --fast
