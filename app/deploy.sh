#!/bin/zsh
# Stage + sync + deploy the Monday Morning app (profile 9cefok).
set -e
cd "$(dirname "$0")"
APP=monday-morning
WS_PATH="/Workspace/Users/sathish.gangichetty@databricks.com/monday-morning-app"

STAGE="${TMPDIR:-/tmp}/mm-deploy"; rm -rf "$STAGE" && mkdir -p "$STAGE"
cp app.yaml requirements.txt "$STAGE"/
cp -R backend "$STAGE"/backend
mkdir -p "$STAGE"/static && cp -R frontend/dist/. "$STAGE"/static/
find "$STAGE" -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || true

# Always delete + re-import (user directive): no stale files from incremental syncs.
databricks workspace delete "$WS_PATH" --recursive --profile 9cefok 2>/dev/null || true
databricks workspace import-dir "$STAGE" "$WS_PATH" --profile 9cefok
databricks apps deploy "$APP" --source-code-path "$WS_PATH" --profile 9cefok
databricks apps get "$APP" --profile 9cefok -o json | python3 -c "import sys,json; d=json.load(sys.stdin); print('URL:', d['url'], '| app:', d.get('app_status',{}).get('state'), '| compute:', d.get('compute_status',{}).get('state'))"
