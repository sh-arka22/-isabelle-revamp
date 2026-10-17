#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Goals sidebar: sanitised colour output, facts, messages, done state, margin.
code_executable="${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}"
npm run compile --prefix extension
node extension/test/unit_goals.cjs
node extension/test/unit_goalsView.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/goals-port"
exec "$code_executable" \
  --user-data-dir "$PWD/.dev-host/goals-test-user" \
  --extensions-dir "$PWD/.dev-host/extensions" \
  --disable-extensions --skip-welcome --skip-release-notes \
  --extensionDevelopmentPath="$PWD/extension" \
  --extensionTestsPath="$PWD/extension/test/goals.cjs" \
  "$PWD"
