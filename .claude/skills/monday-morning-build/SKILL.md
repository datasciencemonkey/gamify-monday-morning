---
name: monday-morning-build
description: Build and deploy the Monday Morning CPG Retail Insights Databricks App in under 30 minutes. Use when asked to build, rebuild, deploy, or rehearse the Monday Morning app / conference demo. Encodes every gotcha discovered in the original build so no session re-pays for them.
---

# Monday Morning — 30-Minute Build & Deploy

You are building the app specified in `BUILD-SPEC.md` (read it first; `requirements/` is the
canonical UI/AI ground truth with reference screenshots in `requirements/assets/`).
**Measured budget: ~18 min total.** Everything upstream (data, Genie, app shell) already exists.

## Environment constants (do not rediscover)

| Thing | Value |
|---|---|
| CLI profile | `9cefok` → `https://fevm-serverless-9cefok.cloud.databricks.com` |
| Data | `serverless_9cefok_catalog.monday_morning` (11 Delta tables, verified) |
| SQL warehouse | `66fba25b212c4d4c` (Serverless Starter, PRO) |
| App | `monday-morning` → `https://monday-morning-7474645105283837.aws.databricksapps.com` |
| App SP client id | `f69cf063-95b3-4b57-8907-0b073cd72b38` (has USE CATALOG/SCHEMA + SELECT + warehouse CAN_USE) |
| Genie MCP | `https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie` (`genie_ask` / `genie_poll_response`, polling transport) |
| Genie PAT secret | scope `monday-morning`, key `genie_pat` → app resource `genie-pat` → env `GENIE_PAT` |
| User auth scopes | `["sql", "dashboards.genie", "genie"]` — the `genie` scope is the one that grants MCP access |

## Runbook (measured times)

1. **Pre-flight (~1 min):** `databricks auth profiles | grep 9cefok` must say YES (else have the
   user run `! databricks auth login https://fevm-serverless-9cefok.cloud.databricks.com --profile 9cefok`).
   `cd app/frontend && npm install` (seconds when cached).
2. **Components (~12 min):** the 12 files in `app/frontend/src/components/` are stubs; build them
   with the checked-in workflow: `Workflow({scriptPath: "app/workflows/components.js"})`
   (7 parallel agents + a tsc/build fixer; paths inside are absolute — sed them to the current
   checkout root first if it differs). Don't hand-write components; the workflow is proven.
3. **Deploy (~4 min):** `cd app && ./deploy.sh`. It stages OUTSIDE the repo, deletes the
   workspace folder, re-imports, deploys, prints the URL.
4. **Verify (~2 min):** see Verification below. Optional deep QA: `app/workflows/critique.js`.

## THE GOTCHAS (symptom → cause → fix)

1. **Random 500s under concurrent load, CLI error "cache update: exit status 45"** → parallel
   requests each ran `databricks auth token --force-refresh` and corrupted the token cache →
   token acquisition is lock-serialized with in-process caching (`backend/db.py ambient_token`)
   plus one retry in `q()`. Already in the foundation — don't remove it.
2. **Deploy fails "no files found"** → `databricks sync` honors the repo's `.gitignore`, which
   ignores the staging dir → `deploy.sh` stages in `$TMPDIR` and **always**
   `workspace delete --recursive` + `workspace import-dir` (user directive: never incremental-sync).
3. **Genie 502/403 on the deployed app while SQL works** → three stacked causes:
   (a) without user-auth scopes Apps forwards no token and the SP has no Genie access;
   (b) `dashboards.genie` alone is NOT enough — the **`genie` scope ("Allows the app to access
   Databricks Genie") is the one the workspace MCP requires**;
   (c) tokens minted before a scope change keep failing until the user **re-consents** (reopen app).
   → Auth chain in `backend/genie.py`: forwarded `X-Forwarded-Access-Token` → **on 401/403 retry
   with `GENIE_PAT`** → ambient SP. The retry-on-403 is load-bearing; keep it.
4. **`apps update` silently wipes config** → the update REPLACES whole field sets → always send
   `user_api_scopes` AND `resources` together in one `--json`.
5. **"Cannot deploy/update: update in progress"** → the platform serializes app updates → retry
   loop with ~20s sleeps until it clears.
6. **Genie answers from the wrong schema** (e.g. a `buckle` apparel schema) → the workspace MCP
   routes across ALL data the caller can read → every new conversation is prefixed with the
   `GROUNDING` preamble in `backend/genie.py`. Keep it.
7. **Genie turns take 70–260 s** → UI polls `/api/genie/poll` every 3 s with typing dots and the
   latest progress step; the **Executive Brief never calls Genie** (computed + templated,
   instant) — a live demo cannot wait out a Genie turn.
8. **Slow/failing first paint** → 8 components fetch at once on mount → startup cache warmup in
   `backend/main.py` prefetches every query; keep it.
9. **Raw floats in Genie chat tables** ("250585.68999999992") → the single most exec-visible
   defect → `GenieMarkdown` formats currency/percent cells, humanizes snake_case headers,
   renders `- ` lines as list items. The component workflow prompt already specifies this.
10. **Mover cards don't match the reference** → ranking rules in `backend/metrics.py movers()`:
    underperformers = Dec YoY between 200–1200% ordered by plan-gap (asc by pct);
    new items = `new_item_pct=100` AND MoM ≥ +20% ordered by Dec sales. These reproduce the
    reference lists exactly (Cling Wrap 747.5 → VacSeal Quart 771.4; Boot Weather Guard…).
11. **Visual fidelity bar** → centered `max-w-[1060px]` container, tinted brief chips, sparkle
    Ask Genie affordances, em-dash typography. Compare against `requirements/assets/*.jpg`;
    executive-ready is acceptance criterion 8.
12. **Stop hook / timing** → the 30-minute condition is satisfiable only by the runbook above;
    do NOT add a critique workflow inside the timed window (it's the optional post-gate).

## Verification (deployed)

```bash
TOKEN=$(databricks auth token --profile 9cefok | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
APP=https://monday-morning-7474645105283837.aws.databricksapps.com
curl -s -H "Authorization: Bearer $TOKEN" $APP/api/health                      # {"ok":true}
curl -s -H "Authorization: Bearer $TOKEN" $APP/api/metrics/exec-kpis | head -c 120
# total_sales must be 2401623; underperformers list must start Cling Wrap 747.5
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"question":"What are total sales by category this month?"}' $APP/api/genie/ask
# status in_progress + IDs → poll /api/genie/poll until completed; answer must cite monday_morning
```

8 acceptance criteria: BUILD-SPEC §6. Data regeneration (only if schema damaged):
`cd data && uv run python generate.py` (deterministic, ~3 min).
