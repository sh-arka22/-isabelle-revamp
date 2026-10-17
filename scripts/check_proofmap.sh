#!/usr/bin/env bash
# ProofMap acceptance: pure unit tests, then the viewer inside stock VS Code
# (replay snapshot, live dag.json watcher, open file:line, pop-out command).
# Usage: bash scripts/check_proofmap.sh [path to the VS Code application executable]
set -euo pipefail
cd "$(dirname "$0")/.."
npm run compile --prefix extension
node extension/test/unit_proofmap.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/proofmap-port"
exec "${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}" \
  --user-data-dir "$PWD/.dev-host/proofmap-test-user" --extensions-dir "$PWD/.dev-host/extensions" \
  --disable-extensions --skip-welcome --skip-release-notes \
  --extensionDevelopmentPath="$PWD/extension" --extensionTestsPath="$PWD/extension/test/proofmap.cjs" "$PWD"
