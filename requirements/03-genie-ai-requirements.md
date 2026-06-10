# 03 — Genie / AI Requirements

Every AI affordance in the app routes through **Databricks Genie**. The narrator will supply the
Genie MCP connection specifics separately ("I'll give you the specifics around the Genie MCP and
whatnot") — so all four surfaces below must sit behind one swappable Genie client interface
(**AI-0**).

## AI-0 · Genie client abstraction

- Single module/service that exposes: `ask(question, context) → streamed answer`,
  `generate_brief(period_kpis) → structured brief`, `insights(selection) → structured insights`,
  `suggested_questions(room) → list`, `history(room) → conversations`.
- Implementation target: Genie Conversation API / Genie MCP (pending D1). For the 30-minute
  build, surfaces must degrade gracefully (loading → empty/error state) if Genie is unreachable
  (NFR-6).

## AI-1 · Ask Genie buttons + modal (every KPI, chart, and table header)

**Trigger:** `⌕ Ask Genie` buttons on: all 8 KPI cards, Executive Brief is separate (AI-2), both
charts, Category Management KPIs, Top Movers, Underperformers, New Items, all 4 secondary KPI
cards, Inventory Health by Store, the drill-down table, and store comparison (observed on every
sectional header).

**Behavior (observed for Total Sales):**
1. Modal opens: title `Ask Genie: {component name}`, × to close.
2. The app **auto-composes and auto-sends** a context-aware analytical prompt containing the
   component's current values, rendered as the user's message bubble. Observed example:
   > "Total sales reached $2.4M (-11.2% vs plan). Decompose the variance vs plan by category and
   > store — show me the top 3 contributors and the top 3 detractors. For each detractor,
   > recommend a specific corrective action."
3. Typing indicator (`•••`) while Genie answers; answer renders in the thread.
4. Follow-up input (`Ask a follow-up question…`) continues the same Genie conversation.

**Requirement:** each component defines its prompt template with interpolated live values
(value, delta, vs-plan/vs-PY context) following the observed pattern: *state the fact →
decompose/contextualize → ask for top contributors/detractors → request specific corrective
action*.

## AI-2 · Generate Brief (Executive Summary)

**Trigger:** red **Generate Brief** button on the Executive Brief card.
**Stated contract (card copy):** "have Genie polish the current-period KPIs into a 2-3 sentence
executive summary with KPI chips."

**Behavior:** click → button becomes `⟳ Generating…` (non-blocking; user can scroll) → brief
renders in the card. Structured output observed (DASH-4 carries full text):

| Part | Contract |
|---|---|
| Headline | 2–3 sentences: total + margin, leader category + anomaly (only declining category), breadth statement (how many categories growing) |
| KPI chips | 6 chips with label+value and semantic color: Total Sales, Total Margin, Avg Margin %, In-Stock Rate, Top Category ($), Categories Growing MoM (`4 of 5`) |
| Detail paragraph | Per-category MoM growth/margin callouts; ranges (`49.4%–55.4%`) |
| Provenance footnote | e.g. "Based on current-period monthly sales data across 5 product categories, with month-over-month comparisons." |

Precision note: chips/brief use exact figures (`$2,401,623`, `$1,283,688`, `$670,566`) while KPI
cards show abbreviated (`$2.4M`) — both render from the same fact rows.

## AI-3 · Executive Insights (Detailed Breakdown — build last, FR-13)

**Trigger:** selecting a category/subcategory in the drill-down (auto-runs; `Dismiss` to hide).
**Loading:** `Analyzing {selection} performance…`.
**Structured output contract (Bags & Wraps observed, DASH-14 carries full text):**
1. **Summary paragraph** — total sales (to the cent), plan-tracking range across SKUs, margin
   band, inventory risk (DOS range, in-stock floor).
2. **Five titled insight cards** (fixed taxonomy, color-coded):
   - Sales Leader (blue) — top SKU, $ and units, vs PY, vs plan caveat
   - Margin Performance (green) — highest/lowest margin SKUs, consistency statement
   - Inventory & In-Stock Risk (red) — lowest in-stock SKUs with DOS, urgency framing
   - Promo Effectiveness (green) — best promo-lift SKU + $/linear-foot productivity
   - Plan Attainment Risk (amber) — plan misses, weakest YoY growth, new-item context
     (references raw field `new_item_pct=100`)
3. **Recommendation banner** (dark) — single prescriptive action: replenishment priorities with
   the combined revenue at risk, plus the promo lever to close the plan gap.

## AI-4 · AI Genie chat tab

- Persistent chat room per page: header `Ask Genie · Monday Morning`, scoped to the **"Sales
  room"** with topic tags `sales · margin · inventory · e-commerce`.
- Left rail: `+ New Chat`, conversation history (persisted server-side — `Loading history…`
  state proves async fetch; empty state `No previous chats yet`). Storage: **Lakebase Postgres**
  (dev instance + prod service-principal model in
  [databricks-resource-requirements.md](databricks-resource-requirements.md)); conversations
  keyed by `user_id` captured from the app's authenticated user.
- Right rail: 10 suggested questions (DASH-15 list), fetched async (`Loading…`).
- Center: empty state ("Click a suggested question or type your own below"); input `Ask a
  question about your CPG data…` + **Ask**. Clicking a suggested question submits it.
- Narration intent: "all the things here are going to culminate into a question that you can ask
  here in the chat" — i.e., anything the dashboards provoke must be answerable here (same Genie
  space as AI-1/AI-2).

## AI-5 · Genie space ("Sales room") requirements

The Genie space sits over the synthetic tables (DATA-7) and must answer, at minimum:
- The 10 suggested questions verbatim (they imply: weekly grain, monthly grain, category/SKU
  rollups, plan + PY comparisons, root-cause decomposition, store-level in-stock, e-commerce
  conversion by month, case-fill/OTIF metrics).
- The per-component modal prompts (AI-1), which add: variance-vs-plan decomposition by category
  and store, top-N contributors/detractors.
- Follow-up questions in conversation context.

Configuration implied by the UI: space name ≈ "Monday Morning — Sales room"; curated table set
spanning sales, margin, inventory, e-commerce; suggested questions registered in the space (the
UI fetches them rather than hardcoding).
