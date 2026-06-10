# 01 — Product Requirements (PRD)

**Product:** Monday Morning — CPG Retail Insights
**Source:** `quick-brief.mov` narration + reference UI (a live Databricks App at
`https://live-data-intelligence-<id>.aws.databricksapps.com`)
**Date extracted:** 2026-06-10

## 1. Vision

A Monday-morning executive report for a CPG retail business, delivered as an interactive
Databricks App instead of a static deck. Every number an executive sees is one click away from an
AI explanation: KPI cards ask Genie to decompose variance, a one-click Executive Brief turns the
current period into board-ready prose, and a persistent AI Genie chat answers anything the
dashboards prompt the reader to wonder.

> Narration: "Here's what I want to build and deploy as a Databricks app… a UI design for Monday
> morning reports, for CPG retail insights for executives. We want to replicate practically
> everything that you see in the screen."

## 2. Goals & non-goals

### Goals
- **G1.** Replicate the reference Sales Performance experience (all three tabs) pixel-faithfully
  enough that a viewer of the reference video recognizes the rebuilt app.
- **G2.** Deploy on Databricks as a Databricks App ("build out this exact same capability
  directly on Databricks and deploy that into Databricks").
- **G3.** Back every visual with synthetic data generated on Databricks ("we can make up the
  data… generate synthetic data for all these things").
- **G4.** Wire all AI affordances through Databricks Genie (specifics of the Genie MCP supplied
  separately by the narrator).
- **G5.** Be buildable live in under 30 minutes at a conference (the meta-goal for this exercise).

### Non-goals (this build)
- **NG1.** The other suite pages — 02 Demand, 03 Audience, 04 In-Store, 05 Measurement,
  Multi-Agent Genie, Architecture — appear in navigation but are not specified in the video.
  Render the nav; stub the pages. (The Demand SKU deep-link target may render a placeholder.)
- **NG2.** Real data integrations, write paths, or auth beyond what Databricks Apps provides.
- **NG3.** Mobile layout (reference is a ~1918×968 desktop recording).

## 3. Users

| Persona | Need |
|---|---|
| CPG retail executive (primary) | Monday-morning read: where are sales vs plan, what needs attention, why — without asking an analyst |
| Category manager (secondary) | Category → subcategory → SKU drill-down, store-level inventory risk, promo effectiveness |
| Conference audience (meta) | Watch the app get built in <30 minutes on Databricks |

## 4. Functional requirements

IDs referenced by the dashboard spec (DASH-*), AI spec (AI-*), and data spec (DATA-*).

### App shell & navigation
- **FR-1** Single-page Databricks App titled "Monday Morning", subtitle "CPG Retail Insights",
  with a "Live" status pill (green dot) in the header area of the page body.
- **FR-2** Global top nav: Back chevron, Databricks logo, breadcrumb badge `01` + "Sales
  Performance"; section links `01 Sales` (active, dark pill), `02 Demand`, `03 Audience`,
  `04 In-Store`, `05 Measurement`; right-aligned red links `Multi-Agent Genie` and `Architecture`.
  Only `01 Sales` must be functional (NG1).
- **FR-3** Three tabs on the Sales page: **Executive Summary** (default), **Detailed Breakdown**,
  **AI Genie** (AI Genie tab styled distinctly — amber/highlight when active).
- **FR-4** Tab switches show loading states (e.g., spinner + "Loading executive summary…") and
  charts animate in on render.

### Executive Summary tab
- **FR-5** Eight KPI cards in two rows of four, each with label, large value, optional delta
  sub-line (red negative / green positive), and an **Ask Genie** button (see FR-10, AI spec).
  Exact KPIs and values: DASH-3.
- **FR-6** **Executive Brief** card: helper copy "Click Generate Brief to have Genie polish the
  current-period KPIs into a 2-3 sentence executive summary with KPI chips."; red **Generate
  Brief** button → in-progress "Generating…" pill → rendered brief (headline sentences, six KPI
  chips, supporting detail paragraph, provenance footnote). Spec: AI-2 / DASH-4.
- **FR-7** Charts: **Monthly Sales Trend** (12-month line/area) and **Sales by Category** (donut
  with five labeled segments). Spec: DASH-5/6.
- **FR-8** Tables & lists: **Category Management KPIs** (5 rows × 7 columns), **Top Movers /
  Underperformers / New Items** (three 5-row cards), secondary KPI row (Avg Basket Size,
  Conversion Rate, Private Label, Case Fill Rate), **Inventory Health by Store** (15 rows,
  conditional color on In-Stock % and Days Supply). Spec: DASH-7..10.
- **FR-9** All sectional components carry their own **Ask Genie** affordance (cards, both charts,
  every table/list header).

### Ask Genie (everywhere)
- **FR-10** Clicking any Ask Genie button opens a modal titled "Ask Genie: {context}", which
  auto-submits a context-aware analytical prompt (rendered as the user's message bubble), shows a
  typing indicator while Genie responds, and offers a follow-up input ("Ask a follow-up
  question…") with send button and an × to dismiss. Spec: AI-1.
  > Narration: "This Ask Genie button should trigger off a request to Genie… I'll give you the
  > specifics around the Genie MCP."

### Detailed Breakdown tab
- **FR-11** "Category → Subcategory → SKU Drill-Down" expandable tree-table: 5 category rows →
  subcategory rows → SKU leaf rows with UPCs; 14 metric columns; red/green conditional formatting;
  each SKU row has a **Demand →** button deep-linking to `/app/demand/sku/{sku_id}`. Spec: DASH-12.
- **FR-12** **Store comparison** panel bound to the selected category/subcategory: Leaflet/OSM
  map of the NY/NJ/CT tri-state with one bubble per store (size ≈ sales, color = in-stock band:
  ≥90% green, 80–90% amber, <80% red), hover name labels, click popup (store, city/state, Sales,
  Units, In-stock, On-hand); beside it a sorted horizontal bar chart "Sales by store" with hover
  tooltips; "Top store" callout. Loading state "Loading store comparison…". Spec: DASH-13.
  > Narration: "For every product… this bubble chart with the map and individual locations…
  > for that category, subcategories, SKU drill-down."
- **FR-13** **Executive Insights: {selection}** panel: loading state "Analyzing {selection}
  performance…", then AI-written summary paragraph, five color-coded insight cards (Sales Leader,
  Margin Performance, Inventory & In-Stock Risk, Promo Effectiveness, Plan Attainment Risk), a
  dark Recommendation banner, and a Dismiss action. **Priority: build last** — narration says
  "if we need to add that later on, we can do that." Spec: AI-3 / DASH-14.

### AI Genie tab
- **FR-14** Full chat surface "Ask Genie · Monday Morning": left sidebar (+ New Chat, history
  list with empty state "No previous chats yet" and "Loading history…" state → history persists),
  center chat with empty state and input "Ask a question about your CPG data…" + Ask button,
  right rail of 10 suggested questions (loaded async). Context tag line: "Sales room · sales ·
  margin · inventory · e-commerce". Spec: AI-4.
  > Narration: "All the things here are going to culminate into a question that you can ask here
  > in the chat for the Monday morning."

### Data
- **FR-15** All displayed data comes from synthetic datasets on Databricks calibrated to the
  values observed in the video (so the rebuild looks like the reference). Spec: DATA doc.
- **FR-16** A Genie space (the "Sales room") sits over those datasets and must be able to answer
  all 10 suggested questions plus the per-KPI modal prompts. Spec: AI-5 / DATA-7.

## 5. Non-functional requirements

- **NFR-1 Deploy target:** Databricks Apps (URL pattern `*.databricksapps.com` observed).
- **NFR-2 Buildability:** the full app must be constructible in <30 minutes live; favor a single
  app framework, seeded tables, and component-per-section structure.
- **NFR-3 Responsiveness of AI:** Ask Genie modal opens instantly with the prompt pre-sent;
  loading/typing indicators for every async AI call (modal, brief, insights, suggested questions,
  history). No blocking spinners over the whole page except initial tab load.
- **NFR-4 Visual fidelity:** light cream/off-white background, white cards with subtle borders,
  red as the primary accent (Databricks-flavored), green/red semantic deltas, amber warning tones;
  monospace-styled subtitle ("CPG Retail Insights") and small-caps metric labels.
- **NFR-5 Desktop-first** at ~1280–1920px wide.
- **NFR-6 Demo resilience:** app must render fully even if Genie is unreachable (cards and tables
  are data-driven; AI surfaces degrade to their loading/empty states).

## 6. Dependencies & open items

| # | Item | Owner | Status |
|---|---|---|---|
| D1 | Genie MCP connection specifics ("I'll give you the specifics around the Genie MCP") | Narrator | **Resolved 2026-06-10** — see [databricks-resource-requirements.md](databricks-resource-requirements.md): Genie MCP at `fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie` (`genie_ask` / `genie_poll_response`) |
| D2 | Synthetic datasets on Databricks | This project (next phase) | Spec'd in 04-data-requirements.md |
| D3 | Genie space ("Sales room") over the synthetic tables | This project | Spec'd in AI-5/DATA-7 |
| D4 | Stub behavior for non-Sales nav targets | Build | Decide: disabled vs placeholder route |
| D5 | App-state store (Genie chat history, dismissed insights, cached briefs) | User | **Provided 2026-06-10** — Lakebase Postgres dev instance (`ep-aged-glade-d2zpfa2s…/databricks_postgres`); prod: grant app service principal on the project, all rows keyed by captured `user_id` (see [databricks-resource-requirements.md](databricks-resource-requirements.md)) |

## 7. Acceptance criteria (video-parity checklist)

1. Executive Summary renders all 8 KPI cards with the DASH-3 values and deltas.
2. Generate Brief produces a headline + 6 KPI chips + detail + provenance block (AI-2 format).
3. Every Ask Genie button opens the AI-1 modal with a context-specific pre-sent prompt.
4. Detailed Breakdown expands Food Storage → Bags & Wraps → 4 SKUs with UPCs and Demand links.
5. Selecting a category/subcategory updates the map + sorted bars + (if enabled) Executive Insights.
6. AI Genie tab shows the 10 suggested questions and answers free-text questions about the data.
7. Deployed and reachable as a Databricks App.
