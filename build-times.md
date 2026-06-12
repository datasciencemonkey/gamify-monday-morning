# Build Times — Monday Morning CPG Retail Insights

Measured wall-clock runs of the full build from a pristine checkpoint to **goal achieved**
(deployed to Databricks Apps + all 8 BUILD-SPEC §6 acceptance criteria evidenced).
Clock starts at the session's first action (auth check) and stops when the last
acceptance criterion is verified against the **deployed** app.
Each timed run appends one row to the table and its own phase-breakdown section below.

| Run | Date | Start point | Deployed at | Goal achieved | Result |
|---|---|---|---|---|---|
| 1 | 2026-06-10 | `v1-conference-start` | ~T+14 | **T+17:50** | PASS (8/8) |
| 2 | 2026-06-11 | `v2-clean-start` | **T+15:20** | **T+25:00** | PASS (8/8) |

## Run 2 — 2026-06-11 (from `v2-clean-start`, branch `run/0611-timed`)

T0 = 10:32:56 EDT. App live: https://monday-morning-7474645105283837.aws.databricksapps.com

| Milestone | Wall clock | T+ | Phase duration |
|---|---|---|---|
| Auth check + T0 | 10:32:56 | 00:00 | — |
| Reset to `v2-clean-start` (new run branch, clean -fd) | 10:33:08 | 00:12 | 0:12 |
| `npm install` (cached) | 10:33:38 | 00:42 | 0:30 |
| Component fan-out launched (7 parallel agents) | 10:33:50 | 00:54 | 0:12 |
| All 12 components written | 10:47:33 | 14:37 | **13:43** |
| `tsc --noEmit` + `vite build` clean (no fixer needed) | 10:47:45 | 14:49 | 0:12 |
| Deployed: app RUNNING, deployment SUCCEEDED | 10:48:16 | **15:20** | 0:31 |
| Genie MCP turn completed (cites `monday_morning`, deep link) | ~10:54:35 | ~21:39 | ~6 min turn |
| All 8 acceptance criteria verified | 10:57:56 | **25:00** | 9:40 total verify |

### Acceptance evidence (criteria 1–8)

1. exec-kpis live: `total_sales` exactly **2,401,623** ✅
2. Brief: headline + **6 chips** + detail + provenance ✅
3. Ask Genie affordances on every instrumented component (per-component AI-1 prompts) ✅
4. Drill-down: Food Storage → Bags & Wraps → **4 SKUs**, UPCs **041100000029–032** ✅
5. Store comparison: 15 stores + top store (Yonkers Center), map + sorted bars per spec ✅
6. AI Genie tab: **10** suggested questions; free-text answered via workspace Genie MCP ✅
7. Deployed + reachable as Databricks App in `9cefok` (RUNNING / ACTIVE) ✅
8. Components built from the proven spec prompts; TS strict clean first pass ✅

### Run 2 notes (variance vs run 1)

- **Workflow tool was gated off** in the session (no `ultracode` opt-in active), so the
  checked-in `app/workflows/components.js` couldn't run as a Workflow. Fallback: the same
  7 prompts dispatched as parallel Agent-tool subagents — identical output shape. Cost ~1–2 min
  vs run 1 (slowest agent, genie-surfaces, took 10.7 min).
- **tsc was clean on the first pass** — the fixer stage cost 0 min this run.
- **Deploy took 31 s** (vs ~4 min budget in run 1): app compute was already ACTIVE and the
  delete + import-dir + deploy path went straight through.
- **The Genie verification turn took ~6 min** server-side — above the documented 70–260 s
  range. Budget for one long Genie turn when timing the verify phase.
- ~4 min of the verify phase was probe error on the operator side (`/api/genie/poll` is
  **POST with a JSON body** — a GET with query params falls through to the SPA catch-all and
  returns index.html; `/api/brief` is POST; suggested questions live at
  `/api/suggested-questions`). The deployed app was correct the whole time.

## Run 1 — 2026-06-10 (from `v1-conference-start`, branch `run/build-01`)

First measured rehearsal: components 11.5–12.7 min (dynamic Workflow, 7 agents + fixer),
deploy ~4 min, QA ~2 min → **T+17:50** end-to-end, 8/8 criteria.
