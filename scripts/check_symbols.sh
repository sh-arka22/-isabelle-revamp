#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run compile --prefix extension
node extension/test/unit_symbols.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/symbols-port"
exec "${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}" \
 --user-data-dir "$PWD/.dev-host/symbols-test-user" --extensions-dir "$PWD/.dev-host/extensions" \
 --disable-extensions --skip-welcome --skip-release-notes \
 --extensionDevelopmentPath="$PWD/extension" --extensionTestsPath="$PWD/extension/test/symbols.cjs" "$PWD"
