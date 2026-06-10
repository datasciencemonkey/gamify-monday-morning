# 02 — Dashboard Requirements (UI spec with observed values)

Everything below was read directly off the video frames. Values double as the **calibration
targets** for the synthetic data (see 04-data-requirements.md §6). Reference screenshots in
`assets/`.

## DASH-1 · App shell

- Header bar (sticky, cream background `#f7f5f0`-ish, thin bottom border):
  `‹ Back` · Databricks wordmark+logo · `/` · green-outlined badge `01` · **Sales Performance** (bold)
  · centered nav: **01 Sales** (active: dark pill, white text), `02 Demand`, `03 Audience`,
  `04 In-Store`, `05 Measurement` · right: red links **Multi-Agent Genie** (sparkle icon),
  **Architecture** (cube icon).
- Page heading: **Monday Morning** (serif-ish bold), subtitle `CPG Retail Insights` in monospace,
  right-aligned pill: green dot + `Live`.
- Tabs (segmented control): **Executive Summary** | Detailed Breakdown | ✨ AI Genie. Active tab
  white with border; AI Genie tab turns amber/gold when active.
- Status-bar evidence of deep links: `https://live-data-intelligence-<id>.aws.databricksapps.com/app/demand/sku/SKU-10038`.

## DASH-2 · Tab/page states

- Tab switch → full-area spinner + caption: `Loading executive summary…` (Exec Summary),
  `Loading store comparison…` (store panel), `Analyzing {name} performance…` (insights),
  `Loading history…` / `Loading…` (Genie tab panels).
- Charts animate on entry (line draws left→right; donut sweeps in).
- Scroll-progress pill at bottom center of the viewport.

## DASH-3 · KPI cards (Executive Summary, 2×4 grid)

Card anatomy: small-caps gray label · top-right `⌕ Ask Genie` (blue text) · large bold value ·
delta sub-line (red negative, green positive, gray neutral).

| # | Label | Value | Delta |
|---|---|---|---|
| 1 | TOTAL SALES | **$2.4M** | `-11.2% vs plan` (red) |
| 2 | COMP STORE SALES | **$2.2M** | `+2.1% vs PY` (green) |
| 3 | E-COMMERCE SALES | **$631K** | `+9% vs PY` (green) |
| 4 | TRANSACTION COUNT | **172,948** | — |
| 5 | IN-STOCK RATE | **79.4%** | — |
| 6 | GROSS MARGIN | **52.7%** | — |
| 7 | CUSTOMER TRAFFIC | **432,370** | `-2.7% vs PY` (red) |
| 8 | ON-TIME DELIVERY | **94%** | — |

## DASH-4 · Executive Brief card

- Idle: ✨ **Executive Brief** title · copy: *"Click **Generate Brief** to have Genie polish the
  current-period KPIs into a 2-3 sentence executive summary with KPI chips."* · red button
  **Generate Brief** (sparkle icon).
- Generating: button becomes soft-red pill `⟳ Generating…` (page remains scrollable).
- Rendered (observed output, AI-2 defines the contract):
  - Headline: *"Total sales reached $2,401,623 this month with an average margin of 52.7%,
    reflecting broad category momentum. Food Storage leads all categories at $670,566 in sales
    but is the only category trailing, down 14.5% month-over-month. All other categories — Shoe
    Care, Home Cleaning, Air Care, and Pest Control — posted positive month-over-month growth."*
  - Six KPI chips: `TOTAL SALES $2,401,623` (neutral) · `TOTAL MARGIN $1,283,688` (green) ·
    `AVG MARGIN % 52.7%` (green) · `IN-STOCK RATE 79.4%` (neutral) ·
    `TOP CATEGORY (FOOD STORAGE) $670,566` (red highlight) · `CATEGORIES GROWING MOM 4 of 5` (green).
  - Detail paragraph: Food Storage sole drag at −14.5% MoM; Shoe Care strongest margin 55.4% with
    +3.0% MoM; Air Care & Home Cleaning ≈ +2.5% MoM; Pest Control +1.1% MoM; margins range 49.4%
    (Home Cleaning) → 55.4% (Shoe Care).
  - Footnote (small italic, top-border): *"Based on current-period monthly sales data across 5
    product categories, with month-over-month comparisons."*

## DASH-5 · Monthly Sales Trend (left chart card)

- Red line + light-red area fill; y-axis ticks `$0, $650K, $1.3M, $1.9M, $2.6M`; x-axis months
  `01…12`; values oscillate ≈ $1.6M–$2.5M with a dip at month 02 and recovery by 03.
- Header: **Monthly Sales Trend** + Ask Genie.
- Hover tooltip on data points: `2025-04` / `Sales: $2.4M` — the x-axis is calendar **2025**
  (`01`-`12` = 2025-01...2025-12).

## DASH-6 · Sales by Category donut (right chart card)

- Five segments with leader-line labels (current month $):
  `Food Storage $679K` (red) · `Pest Control $419K` (dark red) · `Air Care $429K` (amber) ·
  `Home Cleaning $436K` (green) · `Shoe Care $452K` (blue).
- Note: brief copy says Food Storage `$670,566` — synthetic data should make the donut label and
  brief agree (target ≈ $670–679K; see DATA §6 note N2).

## DASH-7 · Category Management KPIs table

Columns: CATEGORY · GROWTH VS MARKET (green `+x.xpp`) · TRIP CONV. · BASKET ATTACH · $/LIN FT ·
PLANO COMP. · NEW ITEM SUCCESS (`x/y (z%)`).

| Category | Growth vs Market | Trip Conv. | Basket Attach | $/Lin Ft | Plano Comp. | New Item Success |
|---|---|---|---|---|---|---|
| Air Care | +10.8pp | 63.7% | 38.4% | $326 | 97% | 4/9 (44%) |
| Home Cleaning | +7.6pp | 57.8% | 37.6% | $259 | 96% | 1/10 (10%) |
| Food Storage | +7pp | 53% | 35% | $375 | 89% | 2/10 (20%) |
| Pest Control | +4pp | 54.1% | 38.2% | $252 | 96% | 1/9 (11%) |
| Shoe Care | +1.7pp | 69.5% | 32.3% | $234 | 94% | 1/9 (11%) |

## DASH-8 · Top Movers / Underperformers / New Items (three cards, 5 rows each)

Row anatomy: product name (bold) · category (gray) · right-aligned $ value · delta beneath
(green for movers/new items, red for underperformers).

**Top Movers:** Stain Remover Spray (Home Cleaning) $40K +1478.9% · Suede & Nubuck Cleaner
(Shoe Care) $49K +1438.5% · Liquid Laundry Detergent (Home Cleaning) $94K +1438.5% · Sneaker
Cleaning Kit (Shoe Care) $92K +1438.5% · Indoor Bug Spray (Pest Control) $45K +1419%.

**Underperformers:** Cling Wrap 200ft (Food Storage) $17K 747.5% · Vacuum Seal Rolls 3-Pack
(Food Storage) $77K 749.5% · Aluminum Foil Heavy Duty (Food Storage) $28K 768.6% · Meal Prep
Containers 15ct (Food Storage) $40K 770.5% · Vacuum Seal Bags Quart 50ct (Food Storage) $66K
771.4%. *(All Food Storage — consistent with the brief's "Food Storage is the drag" story. The
% values render red; treat as the underperformance index produced by the ranking query.)*

**New Items:** Boot Weather Guard (Shoe Care) $70K +40% · Vacuum Seal Bags Quart 50ct
(Food Storage) $66K +48% · Plug-In Air Freshener Starter (Air Care) $57K +44% · Citrus Burst
Votive 6-Pack (Air Care) $53K +36% · Plastic Container Set 20pc (Food Storage) $52K +49%.

Rows are clickable (hover highlight observed) → deep-link toward the SKU (status bar showed
`/app/demand/sku/SKU-10038` while hovering Vacuum Seal Rolls 3-Pack).

## DASH-9 · Secondary KPI row (4 cards)

| Label | Value | Sub-line |
|---|---|---|
| AVG BASKET SIZE | **$13.89** | `2 avg items per transaction` |
| CONVERSION RATE | **6.1%** | `NPS Score: 63` |
| PRIVATE LABEL | **24.7%** | `of total sales` |
| CASE FILL RATE | **96.7%** | `OTIF: 92.7%` |

## DASH-10 · Inventory Health by Store table (15 rows)

Columns: STORE · REGION · IN-STOCK % (red <80%, amber 80–81.9%) · NIL PICKS · DAYS SUPPLY
(red when ≤4.9). Sorted ascending by In-Stock %.

| Store | Region | In-Stock % | Nil Picks | Days Supply |
|---|---|---|---|---|
| Greenwich Village | CT Corridor | 76.2% | 100 | 6.1 |
| Norwalk Super | CT Corridor | 77.3% | 81 | 6.1 |
| Jersey City Hub | North NJ | 78% | 87 | 5.4 |
| Manhattan Flagship | NYC Metro | 78.7% | 100 | 5.7 |
| Stamford Town Center | CT Corridor | 79.1% | 94 | 6.7 |
| Staten Island Mall | NYC Metro | 79.2% | 102 | 5.8 |
| Bronx Gateway | NYC Metro | 79.3% | 74 | **4.9** (red) |
| Newark Express | North NJ | 79.8% | 72 | **4.7** (red) |
| Queens Boulevard | NYC Metro | 79.9% | 89 | 6.3 |
| Princeton Junction | Central NJ | 80% (amber) | 103 | 5.4 |
| Yonkers Center | Westchester | 80.1% (amber) | 87 | 6.1 |
| White Plains Plaza | Westchester | 80.7% (amber) | 81 | 5.9 |
| Edison Marketplace | Central NJ | 80.7% (amber) | 91 | 5.1 |
| Brooklyn Heights | NYC Metro | 81% (amber) | 93 | 5.9 |
| Paramus Park | North NJ | 81.7% (amber) | 118 | 6.7 |

## DASH-11 · Ask Genie modal (overlay)

- Title: `✦ Ask Genie: Total Sales` (context name varies) · × close · dimmed backdrop.
- Auto-sent user bubble (indigo/blue) — observed for Total Sales: *"Total sales reached $2.4M
  (-11.2% vs plan). Decompose the variance vs plan by category and store — show me the top 3
  contributors and the top 3 detractors. For each detractor, recommend a specific corrective
  action."*
- Typing indicator (animated `•••`) while awaiting Genie; response area beneath.
- Footer input: `Ask a follow-up question…` + send (paper-plane) button.

## DASH-12 · Detailed Breakdown — drill-down table

Heading: **Category → Subcategory → SKU Drill-Down**.
Columns: NAME · UPC · SALES · UNITS · VS PLAN (red) · VS PY (green) · MARGIN · IN-STOCK
(red <80.5%) · DOS · PROMO LIFT · TRIP CONV · BASKET ATT. · $/LIN FT · NEW ITEM %.
Rows expand with ▶/▼ carets; SKU leaf rows add a red-outlined **Demand →** button.

Category rows (period totals — trailing-12-month scale; see note N1):

| Name | Sales | Units | vs Plan | vs PY | Margin | In-Stock | DOS | Promo Lift | Trip Conv | Basket Att. | $/Lin Ft | New Item % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ▼ Food Storage | $9.0M | 602,205 | -5.3% | +7.2% | 51.8% | 79.5% | 6.1 | 26.5% | 7.8% | 34.1% | $75.5 | 80% |
| → Vacuum Sealers | $5.3M | 180,394 | -3.9% | +8.2% | 55.5% | 78.7% | 5 | 25.8% | 7.5% | 33.6% | $105.1 | 100% |
| → Containers | $2.4M | 181,698 | -6% | +9.6% | 56.1% | 79.2% | 7.5 | 24.3% | 8.5% | 34.6% | $73 | 66.7% |
| → Bags & Wraps | $1.3M | 240,113 | -5.7% | +4.7% | 45.9% | 80.4% | 5.8 | 28.6% | 7.4% | 34.2% | $55.3 | 75% |
| Shoe Care | $4.5M | 567,947 | -2% | +13.4% | 55.4% | 79.4% | 5.3 | 22.6% | 7.6% | 34.8% | $59.4 | 88.9% |
| Home Cleaning | $4.4M | 625,335 | -3% | +12.5% | 49.4% | 80.3% | 6.4 | 24.6% | 7.9% | 35% | $57.4 | 100% |
| Air Care | $4.3M | 565,073 | -2.2% | +11.1% | 54.1% | 79.7% | 5.5 | 25.5% | 7.8% | 34.5% | $61.3 | 88.9% |
| Pest Control | $4.2M | 565,384 | -1.8% | +11.5% | 52.9% | 78.2% | 5.5 | 24.8% | 7.1% | 32.8% | $61.6 | 88.9% |

Bags & Wraps SKU leaf rows (with UPCs):

| SKU | UPC | Sales | Units | vs Plan | vs PY | Margin | In-Stock | DOS | Promo Lift | Trip Conv | Basket Att. | $/Lin Ft | New Item % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gallon Zip Bags 75ct | 041100000029 | $422K | 60,365 | -7.3% | +6.3% | 45.3% | 75.5% | 7 | 26.3% | 8.3% | 29.6% | $54.56 | 100% |
| Aluminum Foil Heavy Duty | 041100000032 | $389K | 59,747 | -8.8% | +3.9% | 46.1% | 77.5% | 5.8 | 26.8% | 7.8% | 37.6% | $47.4 | 0% |
| Sandwich Bags 150ct | 041100000030 | $270K | 57,963 | -2.8% | +7.2% | 46% | 87.2% | 6.3 | 35% | 6.7% | 35% | $64.98 | 100% |
| Cling Wrap 200ft | 041100000031 | $231K | 62,038 | -3.8% | +1.4% | 46% | 81.5% | 4.1 | 26.3% | 6.8% | 34.6% | $54.23 | 100% |

## DASH-13 · Store comparison panel (Detailed Breakdown)

- Title: `📍 Store comparison — {Category or Subcategory}`; subtitle
  `Category|Subcategory · current month sales across all 15 stores`.
- Left: caption `GEOGRAPHIC DISTRIBUTION (NY/NJ/CT)`; legend `● ≥90% stock` (green)
  `● 80–90%` (amber) `● <80%` (red); Leaflet map (`Leaflet | © OSM contributors` attribution),
  +/- zoom; bubble per store sized by sales, colored by stock band; hover → store-name label;
  click → popup card: store name, `City, ST`, `Sales: $8K`, `Units: 1,488`, `In-stock: 83.3%`,
  `On-hand: 443` (Paramus Park example).
- Right: caption `SALES BY STORE (SORTED)`; horizontal red bars, store names as y-labels, x-axis
  `$0–$12K`; hover tooltip `{Store} — Sales: $3K` with bar highlight (Princeton Junction example).
- Top-right callout: `Top store` / **Yonkers Center** / `$11K · 11% of total` (Bags & Wraps case).

## DASH-14 · Executive Insights panel (Detailed Breakdown; build-last per FR-13)

- Title `Executive Insights: {selection}` · right `Dismiss` link.
- Loading: spinner + `Analyzing {selection} performance…`.
- Rendered (Bags & Wraps observed — defines the layout contract):
  - Summary paragraph (sales total to the cent: `$1,311,607.98`, plan-tracking range, margin
    band, inventory concern with DOS/in-stock floor).
  - Five insight cards, colored left borders: **Sales Leader** (blue), **Margin Performance**
    (green), **Inventory & In-Stock Risk** (red), **Promo Effectiveness** (green),
    **Plan Attainment Risk** (amber) — each a titled 1–2 sentence stat-dense finding. The Plan
    Attainment Risk card exposes the field name `new_item_pct=100` (schema hint, see DATA §4).
  - Full-width dark **Recommendation** banner: prescriptive action referencing the at-risk SKUs
    (`$811,373.96 combined revenue base`) and the promo lever (`35.0% lift, $64.98/linear foot`).

## DASH-15 · AI Genie tab

- Three-pane layout. Left: `+ New Chat` button; `HISTORY · MONDAY MORNING`; empty
  `No previous chats yet` / loading `Loading history…`. Center: header `✨ Ask Genie · Monday
  Morning`, right-aligned context tags `🗂 Sales room · sales · margin · inventory · e-commerce`;
  empty state `Ask Genie — Click a suggested question or type your own below`; footer input
  `Ask a question about your CPG data…` + red **Ask** button. Right: `SUGGESTED QUESTIONS`
  (async-loaded), 10 chips:
  1. What are total sales by category this week?
  2. Which SKUs are the top movers this month?
  3. Show the underperforming SKUs in Food Storage
  4. Compare margin % across the 5 categories
  5. What is the week-over-week sales trend?
  6. Which SKUs are furthest below plan?
  7. What are the top root causes of the sales gap?
  8. What is the overall in-stock percentage by store?
  9. What are the e-commerce conversion trends by month?
  10. What is the case-fill and OTIF rate?

## Notes / observed inconsistencies (resolve in data design)

- **N1 · Period scale:** Executive Summary is **current-month** (donut sums ≈ $2.4M = Total
  Sales card) while Detailed Breakdown totals are **trailing-12-month scale** (categories
  $4.2M–$9.0M; Food Storage $9.0M ≈ 12 × current month's $679K is *not* exact — treat drill-down
  as annual aggregates). Synthetic data must support both periods coherently.
- **N2 · Food Storage current month:** donut label `$679K` vs brief `$670,566` — pick one source
  of truth (the fact table) and render both from it.
- **N3 · Underperformer %:** the red 747–771% figures are a ranking metric (not vs-plan %);
  define it in the data layer (e.g., index vs category median) so the UI can reproduce it.
- **N4 · Bags & Wraps total:** SKU rows sum to $1.312M (matches insights `$1,311,607.98`) while
  the rolled-up row shows `$1.3M` — rollups must be computed from leaves.
