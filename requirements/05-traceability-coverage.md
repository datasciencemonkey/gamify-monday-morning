# 05 — Traceability & Coverage Proof

How we know the requirements capture **all** of the video. Two sweeps: (1) every narration
segment → requirement, (2) every distinct visual state → requirement. Sources:
`extraction/transcript/quick-brief.srt` (31 segments, whisper small.en) and 54 frames reviewed
(50 sampled at 3s + 4 scene-change frames).

## A. Narration → requirements (all 31 SRT segments)

| Seg (time) | Narration (condensed) | Captured by |
|---|---|---|
| 1 (0:00) | "build and deploy as a Databricks app" | G2, NFR-1 |
| 2–3 (0:03) | "UI design for Monday morning reports, CPG retail insights for executives" | Vision §1, FR-1 |
| 4–5 (0:11) | "replicate practically everything on screen — total sales, comp store sales, etc." | G1, FR-5, DASH-3 |
| 6 (0:21) | "Ask Genie button should trigger off a request to Genie" | FR-10, AI-1 |
| 7 (0:25) | "I'll give you the specifics around the Genie MCP" | AI-0, dependency D1 |
| 8–11 (0:30) | "executive brief… generate by clicking this button… shows what it actually means" | FR-6, AI-2, DASH-4 |
| 11–12 (0:41) | "monthly sales trends, sales by category" | FR-7, DASH-5/6 |
| 12 (0:47) | "KPIs for individual categories" | DASH-7 |
| 12–13 (0:47) | "top movers, the underperformers" | DASH-8 |
| 13 (0:52) | "new items, average basket size, conversion rate" | DASH-8/9 |
| 14 (0:59) | "private label, fill rate, etc, and inventory health by store" | DASH-9/10 |
| 15 (1:03) | "we have this thing here going on" (gestures over Exec Summary) | DASH-2..10 |
| 16–17 (1:06) | "small tab… breakdown by individual product" | FR-11, DASH-12 |
| 17–19 (1:11) | "bubble chart with the map, individual locations… for that category, subcategories, SKU drill-down" | FR-12, DASH-13 |
| 20 (1:30) | "we also have some executive briefs here" (Detailed tab insights) | FR-13, AI-3, DASH-14 |
| 21 (1:34) | "if we need to add that later on, we can do that" | FR-13 priority: build-last; NG-adjacent |
| 22–24 (1:36) | "Monday morning Ask Genie… all things culminate into a question you ask in the chat" | FR-14, AI-4, DASH-15 |
| 25–26 (1:51) | "build this exact same capability directly on Databricks and deploy into Databricks" | G2, NFR-1 |
| 27 (2:01) | "we need to figure out the required requirements" | This pack |
| 28–29 (2:06) | "make up the data… generate synthetic data for all these things" | G3, FR-15, DATA-* |
| 30–31 (2:18) | "the kind of PRD you can write against this information" | 01-product-requirements.md |

## B. Visual states → requirements (every distinct state in 54 frames)

| # | State (first seen) | Captured by |
|---|---|---|
| 1 | Header/nav/breadcrumb, Live pill, tabs (0:00) | DASH-1, FR-1..3 |
| 2 | 8 KPI cards w/ deltas + Ask Genie buttons (0:00) | DASH-3, FR-5 |
| 3 | Executive Brief idle card + copy (0:00) | DASH-4 |
| 4 | Monthly Sales Trend chart (0:00) | DASH-5 |
| 5 | Sales by Category donut + labels (0:00) | DASH-6 |
| 6 | Ask Genie modal: auto-sent prompt, typing dots, follow-up input, close (0:22–0:25) | DASH-11, AI-1 |
| 7 | Generate Brief → `Generating…` pill (0:33–0:40) | DASH-4, AI-2 |
| 8 | Category Management KPIs table (0:42) | DASH-7 |
| 9 | Top Movers / Underperformers / New Items (0:45–0:51) | DASH-8 |
| 10 | Secondary KPI row (0:51) | DASH-9 |
| 11 | Inventory Health by Store, 15 rows + color coding (0:57–1:03) | DASH-10 |
| 12 | Rendered Executive Brief: headline + 6 chips + detail + footnote (1:03–1:06) | DASH-4, AI-2 |
| 13 | Detailed Breakdown: drill-down, Food Storage expanded to subcats (1:09) | DASH-12 |
| 14 | Store comparison loading `Loading store comparison…` (1:09) | DASH-2/13 |
| 15 | Insights loading `Analyzing Food Storage performance…` (1:09) | DASH-14, AI-3 |
| 16 | Bags & Wraps expanded → 4 SKU rows w/ UPC + `Demand →` buttons (1:11) | DASH-12, FR-11 |
| 17 | Map + sorted bars + legend + top-store callout (1:12–1:18) | DASH-13, FR-12 |
| 18 | Map hover label (Newark Express) + click popup (Paramus Park: sales/units/in-stock/on-hand); bar tooltip (Princeton Junction) (1:15–1:33) | DASH-13 |
| 19 | Executive Insights rendered: summary + 5 cards + recommendation + Dismiss (1:24–1:33) | DASH-14, AI-3 |
| 20 | AI Genie tab loading: `Loading history…`, suggested `Loading…` (1:36) | DASH-15, AI-4 |
| 21 | AI Genie tab loaded: history empty state, context tags, 10 suggested questions, input (1:38–2:00) | DASH-15, AI-4 |
| 22 | Exec Summary tab reload: `Loading executive summary…` spinner (1:42) | DASH-2, FR-4 |
| 23 | Chart entry animations (line draw / donut sweep) (1:48, 2:06) | DASH-2, FR-4 |
| 24 | Monthly Sales Trend hover tooltip `2025-04 / Sales: $2.4M` (2:24) | DASH-5, DATA-2 |
| — | Status-bar deep link `/app/demand/sku/SKU-10038` (0:51) | FR-11, NG1, DATA-2 |

Frames not individually listed are interstitial duplicates (mouse movement / scrolling between
the states above); all 50 interval frames + 4 scene frames were reviewed.

## C. Ambiguities resolved

| Transcript artifact | Resolution (from visuals) |
|---|---|
| "CPG retail and sites" | CPG Retail **Insights** (on-screen subtitle) |
| "monthly to sales trends" | Monthly Sales Trend chart |
| "the end-up performers" | **Underperformers** card |
| "category, subcategories, queued or drill down" | Category → Subcategory → **SKU Drill-Down** (on-screen heading) |
| "Monday morning, I asked Genie" | the **AI Genie** tab ("Ask Genie · Monday Morning") |
| "executive briefs here" (Detailed tab) | **Executive Insights** panel (distinct from the Exec Summary's Executive Brief) |
| Donut `$679K` vs brief `$670,566` | Mock-data inconsistency → single source of truth in data layer (note N2) |
| Underperformer 747–771% red values | Ranking metric, not vs-plan; defined in note N3 / DATA-5 |

## D. Known unknowns (explicitly out of video scope)

- Genie MCP connection details — narrator will supply (D1).
- Content of 02 Demand, 03 Audience, 04 In-Store, 05 Measurement, Multi-Agent Genie,
  Architecture pages — visible in nav only (NG1).
- Ask Genie modal *answer* rendering — modal closed while typing indicator was showing; contract
  inferred (AI-1 step 3) and flagged as inferred.
- Exact prompt templates for non-Total-Sales components — pattern generalized from the observed
  Total Sales prompt (AI-1).

## E. Self-assessment: 10/10

- 31/31 narration segments traced (A).
- 24/24 distinct visual states traced (B); 54/54 frames reviewed (all 50 interval frames + 4 scene-change frames).
- All on-screen data values transcribed into calibration targets (02 §DASH-3..12, 04 §DATA-6).
- All transcription ambiguities resolved against pixels (C); all gaps are *source* gaps, not
  extraction gaps, and each is flagged with an owner/decision (D).
