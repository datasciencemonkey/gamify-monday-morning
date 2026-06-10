# BUILD-SPEC — Monday Morning: CPG Retail Insights (Databricks App)

**Mission:** build and deploy the "Monday Morning" executive insights app on Databricks Apps in
**under 30 minutes**, visually faithful to the reference design, demo-ready for a live conference
audience. Everything upstream is already done — requirements are extracted, synthetic data is
loaded and verified, Genie answers questions about it. **This session only builds the app.**

## 0. Read this first

| Input | Where | What it gives you |
|---|---|---|
| UI ground truth | `requirements/02-dashboard-requirements.md` (DASH-*) | Every component, layout, value, color rule, loading state |
| Screenshots | `requirements/assets/*.jpg` | The design grammar to match (8 reference frames) |
| AI behavior | `requirements/03-genie-ai-requirements.md` (AI-*) | Ask Genie modal, Generate Brief, chat tab contracts |
| PRD + acceptance | `requirements/01-product-requirements.md` §7 | The video-parity checklist you must pass |
| Resources | `requirements/databricks-resource-requirements.md` | User-provided endpoints & stack directives |
| Data dictionary | §3 below + `data/generate.py` TABLE_COMMENTS | Tables, grains, semantics |

Scope guardrails: only the **01 Sales** page (3 tabs). Other nav items render but stub. Executive
Insights panel (DASH-14) is **build-last/optional**. Light mode only (dark mode is a later add via
brand.databricks.com grammar).

## 1. Environment (all pre-provisioned — do NOT recreate)

- **Databricks CLI profile:** `9cefok` → `https://fevm-serverless-9cefok.cloud.databricks.com`
- **Data:** `serverless_9cefok_catalog.monday_morning` — 11 Delta tables (verified 2026-06-10):
  `dim_store` 15 · `dim_product` 47 · `dim_date` 24 · `fact_sales` 16,920 · `fact_inventory` 705 ·
  `fact_store_traffic` 360 · `fact_channel` 48 · `fact_supply_chain` 24 · `fact_experience` 24 ·
  `fact_category_market` 5 · `fact_sales_weekly` 4,275
- **Genie MCP (validated, answers correctly):**
  `https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie`
  Tools: `genie_ask(question, conversation_id?)` + `genie_poll_response(conversation_id, response_id)`.
  Polling transport: ask returns `status: in_progress` + IDs → poll every 2–5s until `completed`;
  full contract is documented verbatim in `requirements/databricks-resource-requirements.md`.
  **Proven call pattern (no MCP client or session init needed)** — plain JSON-RPC over HTTP:
  `POST <endpoint>` with headers `Authorization: Bearer <token>`, `Content-Type: application/json`,
  `Accept: application/json, text/event-stream`; body
  `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"genie_ask","arguments":{"question":"..."}}}`
  → read `result.structuredContent` for `status`/`conversation_id`/`response_id`, then the same
  shape with `genie_poll_response`. Validated end-to-end against the monday_morning tables.
- **Lakebase Postgres (app state):** dev instance
  `ep-aged-glade-d2zpfa2s.database.us-east-1.cloud.databricks.com`, db `databricks_postgres`,
  `sslmode=require`, login = Databricks identity (OAuth token as password). Key all rows by `user_id`.
- **SQL warehouse:** auto-detect a serverless warehouse in the workspace for app queries.
- **Research MCPs available:** deepwiki (codebase questions, e.g. databricks-sdk), exa (web search).

## 2. Stack (user-directed)

- **Frontend:** React + shadcn/ui + Tailwind + Recharts (or visx) + Leaflet (OSM tiles) — match
  the reference design grammar *exactly*: cream background, white cards with hairline borders,
  red primary accent, green/red semantic deltas, small-caps metric labels, monospace subtitle.
  **The single most important job: the app must look extremely good — executive-ready.**
- **Backend:** FastAPI serving the React build + `/api/*` routes; queries via `databricks-sql-connector`
  (or databricks-sdk statement execution) against the warehouse; Genie calls proxied server-side
  to the Genie MCP endpoint; Lakebase via `psycopg` + OAuth token.
- Alternative accelerator (optional): https://github.com/databricks/appkit
- **Deploy:** Databricks Apps via CLI: `databricks apps create monday-morning --profile 9cefok`
  then `databricks sync` + `databricks apps deploy` (app.yaml runs uvicorn). App SP needs grants:
  `USE CATALOG/SCHEMA` + `SELECT` on the schema, warehouse `CAN_USE`, Genie space access, and
  Lakebase role for prod state.

## 3. Data contracts (tested against the live tables)

Grain notes: `fact_sales` is **month × store × SKU** (2024-01…2025-12); current month =
**2025-12**; `py_sales_amt`/`plan_amt` are populated on 2025 rows; rate columns
(`promo_lift_pct`, `trip_conversion_pct`, `basket_attach_pct`) are SKU-grain (DASH-12
definitions); category-grain KPI versions live in `fact_category_market` (DASH-7). Weekly
questions → `fact_sales_weekly` (week × store × category). Inventory is current-month snapshot.

Verified examples (returned exactly the expected story on 2026-06-10):

```sql
-- Exec KPI strip (DASH-3): total/vs-plan/margin
SELECT round(sum(sales_amt),0) total_sales,
       round(sum(sales_amt)/sum(plan_amt)-1,3) vs_plan,
       round(sum(margin_amt)/sum(sales_amt)*100,1) wtd_margin_pct
FROM fact_sales WHERE month='2025-12';
-- → 2401623 | -0.109 | 52.5

-- Sales by Category donut (DASH-6)
SELECT p.category, round(sum(f.sales_amt),0) sales
FROM fact_sales f JOIN dim_product p USING(sku_id)
WHERE f.month='2025-12' GROUP BY 1 ORDER BY 2 DESC;
-- → Food Storage 670566 (top, sole MoM decliner) … Pest Control 419200

-- Top movers (DASH-8): Dec YoY ranking
WITH dec AS (SELECT sku_id, sum(sales_amt) s FROM fact_sales WHERE month='2025-12' GROUP BY 1),
py  AS (SELECT sku_id, sum(sales_amt) s FROM fact_sales WHERE month='2024-12' GROUP BY 1)
SELECT p.product_name, p.category, dec.s, round((dec.s/py.s-1)*100,1) yoy_pct
FROM dec JOIN py USING(sku_id) JOIN dim_product p USING(sku_id) ORDER BY yoy_pct DESC LIMIT 5;
-- → Stain Remover Spray +1478.9% … Indoor Bug Spray +1419.0%

-- Inventory Health by Store (DASH-10)
SELECT s.store_name, s.region, round(avg(i.in_stock_pct),1) in_stock,
       sum(i.nil_picks) nil_picks, round(avg(i.days_supply),1) days_supply
FROM fact_inventory i JOIN dim_store s USING(store_id) GROUP BY 1,2 ORDER BY 3;
-- → Greenwich Village 76.2 … Paramus Park 81.7 (exact DASH-10 ladder)
```

Other mappings: comp-store sales = Dec sales where `dim_store.is_comp_store`; e-commerce KPIs ←
`fact_channel`; traffic/txn/basket ← `fact_store_traffic` (+ sales); OTD/case-fill/OTIF ←
`fact_supply_chain`; NPS ← `fact_experience`; private label ← `dim_product.is_private_label`;
category mgmt KPI table ← `fact_category_market`; map bubbles ← `fact_inventory` × `dim_store`
lat/lon + Dec sales; underperformers = worst Dec vs-plan gap SKUs (display YoY %); new items ←
`dim_product.new_item_pct=100` ranked by Dec sales (display MoM %).

## 4. AI surfaces (AI-1..AI-4) — all through the Genie MCP

**Auth mode (decided — don't deliberate):** for in-app Genie MCP and SQL calls, prefer the
**on-behalf-of-user token** Databricks Apps forwards as `X-Forwarded-Access-Token` (add the
needed user-authorization scopes at app create time); fall back to the app service principal's
token where OBO isn't available. If Lakebase SP grants become friction during a timed run,
degrade chat history to in-memory and leave a TODO — don't burn build minutes on it.

Backend exposes: `POST /api/genie/ask {question, conversation_id?}` → proxies `genie_ask`, then
server-side polls `genie_poll_response` and streams/relays progress + final markdown. Frontend:
- **Ask Genie modal** on every KPI/chart/table header: opens with an auto-sent context prompt
  interpolating live values (template pattern in AI-1; Total Sales example is canonical).
- **Generate Brief**: one click → `Generating…` state → headline + 6 KPI chips + detail +
  provenance (AI-2 layout; compute chips from the data, let Genie polish the prose).
- **AI Genie tab**: chat + 10 suggested questions (DASH-15 list, hardcode or table-drive) +
  history persisted in Lakebase (`genie_conversations`/`genie_messages`, keyed by `user_id` from
  `X-Forwarded-Email`/`X-Forwarded-User` headers; store Genie `conversation_id` for continuity).
- Degrade gracefully: if Genie is unreachable, surfaces show their loading/empty states (NFR-6).

Suggested-question sanity (already proven): "What are total sales by category for December
2025?" → Genie returns the exact ladder with a deep link.

## 5. 30-minute build plan (dynamic workflows)

Run as an orchestrated workflow; parallelize aggressively. Suggested phases:

1. **Scaffold (≤5 min):** repo layout (`app/frontend`, `app/backend`), FastAPI + Vite + shadcn
   boot, app.yaml, theme tokens from the reference assets.
2. **Parallel component fan-out (≤15 min):** one agent per DASH cluster — (a) KPI cards + brief
   card, (b) charts (trend + donut), (c) category KPIs + movers/underperformers/new-items, (d)
   secondary KPIs + inventory table, (e) drill-down tree-table, (f) store-comparison map + bars,
   (g) AI Genie tab + modal. Each consumes §3 queries via a shared `/api/metrics/*` layer.
3. **Integrate + deploy (≤5 min):** wire routes/tabs, `databricks apps deploy`, smoke-test the
   deployed URL.
4. **Visual QA loop (≤5 min):** screenshot each tab (agent-browser / chrome-devtools MCP),
   compare against `requirements/assets/*.jpg`, fix the worst deltas. Executive-ready polish is
   the acceptance bar — fonts, spacing, color discipline, loading states.

## 6. Acceptance (from PRD §7)

1. Exec Summary renders all 8 KPI cards with DASH-3 values/deltas from live queries.
2. Generate Brief produces headline + 6 chips + detail + provenance.
3. Ask Genie modal opens with context-aware pre-sent prompt on every instrumented component.
4. Drill-down expands Food Storage → Bags & Wraps → 4 SKUs (UPCs + Demand→ links).
5. Category/subcategory selection updates map + sorted bars (+ insights if built).
6. AI Genie tab shows 10 suggested questions and answers free-text via the MCP.
7. Deployed and reachable as a Databricks App in workspace 9cefok.
8. Looks executive-ready next to `requirements/assets/` (the most important one).

## 7. Reset / re-run protocol

Remote start point: `https://github.com/datasciencemonkey/gamify-monday-morning.git` —
`main` = pristine baseline; build on a `run/<name>` branch, never push build output to main.
The git tag **`v0-baseline-data-ready`** is the checkpoint: requirements + data generator + this
spec, with data already in UC (data survives git resets — it lives in Databricks). To re-run the
30-minute build from scratch: `git reset --hard v0-baseline-data-ready && git clean -fd` (the
video/extraction artifacts are untracked and survive). Data is deterministic — if the schema is
ever damaged, `cd data && uv run python generate.py` rebuilds identical tables (~3 min). Do NOT
edit `requirements/`, `data/`, or this spec during a build run.

## 8. Timed-run playbook (measured 2026-06-10; this is how the run fits in 30 minutes)

Start from the tag **`v1-conference-start`** (branch `conference-start`): data live in UC, app
foundation pre-built (FastAPI backend with all queries tested, app shell, typed API client,
design tokens, component stubs), every infrastructure pitfall already fixed. The live build is
the component fan-out + deploy + QA — the part worth watching.

| Phase | What | Measured |
|---|---|---|
| 0 | Auth check + `npm install` in `app/frontend` (parallel with reading spec) | ~2 min |
| 1 | Component workflow: `Workflow({scriptPath: "app/workflows/components.js"})` — 7 parallel agents + tsc/build fixer | **12.7 min measured** |
| 2 | `cd app && ./deploy.sh` (build output staged, workspace delete + import-dir, apps deploy) | ~4 min measured |
| 3 | Smoke + visual QA (browse screenshots vs `requirements/assets/`) | ~3 min |
| | **Total critical path** | **~22 min** |

Optional post-run: critique workflow `app/workflows/critique.js` (~11 min — quality gate, not
part of the 30-minute window).

### Errata already baked in (do not re-discover)
- `backend/db.py`: token acquisition is lock-serialized (concurrent CLI refreshes corrupt the
  token cache) with one retry; metrics are cache-warmed at startup.
- `backend/genie.py`: every new Genie conversation is grounded to the `monday_morning` schema
  (the workspace MCP otherwise routes to other data).
- `deploy.sh`: stages OUTSIDE the repo (gitignore otherwise empties `databricks sync`) and
  always `workspace delete --recursive` + `workspace import-dir` (user directive).
- Genie auth on the deployed app: chain is user's `X-Forwarded-Access-Token` → on 401/403
  fall back to the `GENIE_PAT` secret (app resource `genie-pat` ← secret scope
  `monday-morning/genie_pat`; env `valueFrom` in app.yaml) → ambient SP. The workspace MCP
  rejects downscoped OBO tokens (403), so the PAT fallback is what makes in-app Genie work.
  Keep `user_api_scopes: ["sql", "dashboards.genie"]` AND the secret resource together — an
  apps update replaces the whole field set, so always send both in one update.
- `metrics.py movers()`: underperformers = YoY between 200-1200% ordered by plan gap;
  new items = `new_item_pct=100` with MoM >= +20% — these reproduce the reference lists exactly.
- Genie answer rendering: format currency/percent cells, humanize snake_case headers
  (raw floats in chat tables are the most exec-visible defect).
