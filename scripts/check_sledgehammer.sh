#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Pure checks first (no editor), then the live Sledgehammer run in stock VS Code.
npm run compile --prefix extension
node extension/test/unit_markupXml.cjs
node extension/test/unit_proofInsert.cjs
export ISABELLE_REVAMP_PORT_FILE="$PWD/.dev-host/sledgehammer-port"
exec "${1:-/Applications/Visual Studio Code.app/Contents/MacOS/Code}" \
 --user-data-dir "$PWD/.dev-host/sledgehammer-test-user" --extensions-dir "$PWD/.dev-host/extensions" \
 --disable-extensions --skip-welcome --skip-release-notes \
 --extensionDevelopmentPath="$PWD/extension" --extensionTestsPath="$PWD/extension/test/sledgehammer.cjs" "$PWD"
