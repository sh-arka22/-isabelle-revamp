#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# The goal at the caret, its gutter mark and MCP goals_at do not wait for
# commands after the caret (vscode_caret_perspective=0 checks the whole theory).
code_executable="${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}"
npm run compile --prefix extension
node extension/test/unit_outline.cjs
node extension/test/unit_goals.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/goalsLocal-port"
exec "$code_executable" \
  --user-data-dir "$PWD/.dev-host/goalsLocal-test-user" \
  --extensions-dir "$PWD/.dev-host/extensions" \
  --disable-extensions --skip-welcome --skip-release-notes \
  --extensionDevelopmentPath="$PWD/extension" \
  --extensionTestsPath="$PWD/extension/test/goalsLocal.cjs" \
  "$PWD"
