#!/bin/zsh
# Stage + sync + deploy the Monday Morning app (profile 9cefok).
set -e
cd "$(dirname "$0")"
APP=monday-morning
WS_PATH="/Workspace/Users/sathish.gangichetty@databricks.com/monday-morning-app"

rm -rf .deploy && mkdir -p .deploy
cp app.yaml requirements.txt .deploy/
cp -R backend .deploy/backend
mkdir -p .deploy/static && cp -R frontend/dist/. .deploy/static/
find .deploy -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || true

databricks sync .deploy "$WS_PATH" --full --profile 9cefok
databricks apps deploy "$APP" --source-code-path "$WS_PATH" --profile 9cefok
databricks apps get "$APP" --profile 9cefok -o json | python3 -c "import sys,json; d=json.load(sys.stdin); print('URL:', d['url'], '| app:', d.get('app_status',{}).get('state'), '| compute:', d.get('compute_status',{}).get('state'))"
