# 04 — Synthetic Data Requirements (Databricks)

Goal: generate synthetic datasets **on Databricks** (Unity Catalog + Delta) that (a) make the
rebuilt app visually match the reference video, and (b) let the Genie space answer every
suggested/modal question. Narration: "we can make up the data… generate synthetic data for all
these things and then go from there."

## DATA-1 · Platform & layout

- Unity Catalog: catalog `serverless_9cefok_catalog`, new dedicated schema (e.g. `monday_morning`), via Databricks profile `9cefok` (per [databricks-resource-requirements.md](databricks-resource-requirements.md)).
- Delta tables, seeded + **deterministic** (fixed random seed) so re-runs reproduce the video's
  numbers; generation runs as a notebook/job (Python, run with `uv` locally or serverless on
  Databricks).
- Small enough to build in minutes: ~10–60K fact rows total.

## DATA-2 · Business universe (fixed by the video)

- **Retailer:** CPG retail chain, **15 stores** across the NY/NJ/CT tri-state.
  Stores + regions are exactly the DASH-10 list (Greenwich Village, Norwalk Super, Jersey City
  Hub, Manhattan Flagship, Stamford Town Center, Staten Island Mall, Bronx Gateway, Newark
  Express, Queens Boulevard, Princeton Junction, Yonkers Center, White Plains Plaza, Edison
  Marketplace, Brooklyn Heights, Paramus Park). Regions: CT Corridor, North NJ, NYC Metro,
  Central NJ, Westchester. Each store needs city/state + lat/lon for the map bubbles.
- **Categories (5):** Food Storage, Shoe Care, Home Cleaning, Air Care, Pest Control.
- **Subcategories:** 3 per category. Observed for Food Storage: Vacuum Sealers, Containers,
  Bags & Wraps. Invent plausible names for the other 12 (e.g., Shoe Care: Polishes, Protectants,
  Cleaning Kits).
- **SKUs:** ~10–12 per category (≈55 total), 12-digit UPC-A in the observed range
  (`0411000000xx`), app SKU ids in the form `SKU-#####` (deep link showed `SKU-10038`).
  **Bags & Wraps must contain exactly the 4 observed SKUs with their exact metric rows**
  (DASH-12). Named products seen elsewhere (top movers/new items lists, DASH-8) must exist under
  the right categories: Stain Remover Spray, Suede & Nubuck Cleaner, Liquid Laundry Detergent,
  Sneaker Cleaning Kit, Indoor Bug Spray, Meal Prep Containers 15ct, Vacuum Seal Rolls 3-Pack,
  Vacuum Seal Bags Quart 50ct, Boot Weather Guard, Plug-In Air Freshener Starter, Citrus Burst
  Votive 6-Pack, Plastic Container Set 20pc.
- **Time:** calendar anchor **2025** (trend tooltip shows `2025-04`); 24 months ending at the current month (MoM, YoY, vs-plan comparisons + 12-month
  trend axis `01…12`), plus week grain inside the current quarter (suggested questions ask
  weekly and week-over-week).

## DATA-3 · Dimensions

| Table | Grain / key columns |
|---|---|
| `dim_store` | store_id, store_name, region, city, state, latitude, longitude |
| `dim_product` | sku_id (`SKU-#####`), upc (12-digit), product_name, category, subcategory, is_new_item (0/1 → `new_item_pct`), is_private_label, linear_feet |
| `dim_date` | date, week, month, month_label (`01`–`12`), year, is_current_month |

## DATA-4 · Facts

| Table | Grain | Measures |
|---|---|---|
| `fact_sales` | store × SKU × month (optionally week) | sales_amt, units, plan_amt, py_sales_amt, margin_amt, promo_lift_pct, trip_conversion_pct, basket_attach_pct, dollars_per_linear_foot |
| `fact_inventory` | store × SKU × month (current month required) | in_stock_pct, nil_picks, days_supply, on_hand_units |
| `fact_store_traffic` | store × month | customer_traffic, transactions, conversion_pct, avg_basket_size |
| `fact_channel` | month × channel (store / e-commerce) | sales_amt, conversion_pct (e-commerce conversion trend by month) |
| `fact_supply_chain` | month | on_time_delivery_pct, case_fill_rate_pct, otif_pct |
| `fact_experience` | month | nps_score |
| `fact_category_market` | category × month | growth_vs_market_pp, planogram_compliance_pct, new_items_launched, new_items_successful |

(Compression into fewer wide tables is acceptable if Genie answers all AI-5 questions; keep
column names self-describing — the UI leaked `new_item_pct`, so keep that name.)

## DATA-5 · Distribution shape (so the story holds)

- **The narrative anomaly:** Food Storage is the #1 category by revenue but the **only** category
  declining: −14.5% MoM and −5.3% vs plan annually; all 5 Food Storage underperformer SKUs come
  from it (DASH-8). All other categories grow MoM: Shoe Care +3.0%, Air Care ≈ +2.5%, Home
  Cleaning ≈ +2.5%, Pest Control +1.1%.
- **Margins by category** (current month): Home Cleaning 49.4% (floor) → Shoe Care 55.4%
  (ceiling); blended 52.7%.
- **Plan:** every category below plan annually (−1.8%…−5.3%); total current month −11.2% vs plan.
- **YoY:** all categories positive vs PY (+7.2%…+13.4%) — the pain is vs *plan*, not vs PY.
- **Monthly trend:** oscillates ≈ $1.6M–$2.5M, dip at month 02, recovery by 03 (DASH-5 shape).
- **In-stock:** store range 76.2%–81.7% (15 exact rows, DASH-10), chain 79.4%; SKU-level lows
  ≈ 75.5% (Gallon Zip Bags). Days supply lows: Newark Express 4.7, Bronx Gateway 4.9 (red flags).
- **Top movers** carry extreme growth (+1419%…+1478.9%) — model as tiny-base PY (new/expanded
  distribution) so the math is defensible.
- **New items:** success ratios per category exactly as DASH-7 (`4/9`, `1/10`, `2/10`, `1/9`,
  `1/9`); `new_item_pct` rollups must reproduce DASH-12 (e.g., Bags & Wraps 75% = 3 of 4 SKUs).

## DATA-6 · Calibration targets (current month unless noted)

The full target tables live in 02-dashboard-requirements.md (DASH-3..10, DASH-12). Headline
numbers the generated data must reproduce after aggregation:

| Metric | Target |
|---|---|
| Total sales / total margin | **$2,401,623** / **$1,283,688** (52.7%) |
| Category sales | Food Storage **$670,566** (display ≈$679K — see N2), Shoe Care $452K, Home Cleaning $436K, Air Care $429K, Pest Control $419K |
| Comp store sales | $2.2M, +2.1% vs PY |
| E-commerce sales | $631K, +9% vs PY |
| Transactions / traffic | 172,948 / 432,370 (−2.7% vs PY) |
| In-stock rate / gross margin | 79.4% / 52.7% |
| On-time delivery / case fill / OTIF | 94% / 96.7% / 92.7% |
| Avg basket / conversion / NPS / private label | $13.89 (2 items) / 6.1% / 63 / 24.7% |
| Annual category totals | Food Storage $9.0M · 602,205 units; Shoe Care $4.5M · 567,947; Home Cleaning $4.4M · 625,335; Air Care $4.3M · 565,073; Pest Control $4.2M · 565,384 |
| Food Storage subcats (annual) | Vacuum Sealers $5.3M · 180,394; Containers $2.4M · 181,698; Bags & Wraps $1.3M ($1,311,607.98) · 240,113 |
| Bags & Wraps SKUs | exactly the 4 DASH-12 leaf rows; combined at-risk base $811,373.96 (Gallon Zip Bags + Aluminum Foil) |
| Store comparison (Bags & Wraps, current month) | Yonkers Center top: $11K · 11% of total; Paramus Park popup: $8K · 1,488 units · 83.3% in-stock · 443 on-hand; bar axis ≤ $12K |

Tolerance (revised per user direction 2026-06-10): **same ballpark + story fidelity**, not
pixel-exact. Headline aggregates within a few percent; the narrative must hold exactly (Food
Storage is the #1 category and the only MoM decliner; movers grow >10x YoY; the worst vs-plan
SKUs are all Food Storage; Yonkers Center leads Bags & Wraps; margin band ~49-55% averaging
~52.7%; store in-stock ladder ~76-82%). Values that are cheap to pin exactly (store inventory
rows, BW SKU rows, headline Dec KPIs) are pinned; everything else lands in the ballpark.

## DATA-7 · Genie space binding

- Create Genie space **"Monday Morning — Sales room"** over the schema; tags: sales, margin,
  inventory, e-commerce.
- Register the 10 suggested questions (DASH-15) in the space; verify each returns a sensible
  answer against the generated data (the acceptance test for this phase).
- The AI-1 modal prompts (variance vs plan decomposed by category and store, top-3
  contributors/detractors) must be answerable from `fact_sales` joins alone.

## DATA-8 · Acceptance checks (data phase definition of done)

1. `SELECT` checks reproduce every DATA-6 target within tolerance.
2. Each DASH table can be produced by a single readable query (these queries become the app's
   data layer).
3. All 10 suggested questions answered correctly by Genie against the space.
4. Re-running generation yields identical numbers (determinism).

## DATA-9 · App-state store (Lakebase Postgres — not analytics data)

Analytics facts/dims (DATA-3/4) live in Unity Catalog Delta; **transactional app state** lives in
**Lakebase** (per [databricks-resource-requirements.md](databricks-resource-requirements.md)):

- Dev instance: `ep-aged-glade-d2zpfa2s.database.us-east-1.cloud.databricks.com`, database
  `databricks_postgres`, `sslmode=require` (psql with Databricks identity).
- Prod: grant the app's service principal usage/create on the Lakebase project.
- Candidate tables (all keyed by `user_id` captured from the authenticated app user):
  `genie_conversations` / `genie_messages` (AI Genie tab history + Ask Genie modal follow-up
  threads, storing Genie `conversation_id`/`response_id`), `generated_briefs` (Executive Brief
  cache per period), `dismissed_insights` (Executive Insights dismiss state).
- Short-term memory / app state only — no synthetic analytics rows here.
