#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Goals sidebar: pins, pause and copy-to-editor (Alex's 15 and 16).
code_executable="${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}"
npm run compile --prefix extension
node extension/test/unit_insertProof.cjs
node extension/test/unit_goalsView.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/goals2-port"
exec "$code_executable" \
  --user-data-dir "$PWD/.dev-host/goals2-test-user" \
  --extensions-dir "$PWD/.dev-host/extensions" \
  --disable-extensions --skip-welcome --skip-release-notes \
  --extensionDevelopmentPath="$PWD/extension" \
  --extensionTestsPath="$PWD/extension/test/goals2.cjs" \
  "$PWD"
