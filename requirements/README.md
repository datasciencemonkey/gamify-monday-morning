# Monday Morning — CPG Retail Insights: Requirements Pack

Requirements extracted from `quick-brief.mov` (2:31 screen-recorded narration over a reference
UI of a deployed Databricks App). The narrator's ask: **replicate practically everything seen on
screen and deploy it as a Databricks App**, backed by **synthetic data** generated on Databricks,
with **Genie** powering all AI interactions.

## Why this exists

This app will be rebuilt **live at a conference in under 30 minutes**. These documents are the
ground truth handed to the build so nothing has to be re-derived from the video:

1. Requirements (this pack) →
2. Synthetic datasets on Databricks (calibrated to the numbers seen on screen) →
3. Live 30-minute app build against those datasets.

## Documents

| Doc | Contents |
|---|---|
| [01-product-requirements.md](01-product-requirements.md) | PRD: vision, personas, scope, functional + non-functional requirements (FR/NFR) |
| [02-dashboard-requirements.md](02-dashboard-requirements.md) | Exhaustive dashboard/UI spec per tab and component, with every value observed on screen (DASH) |
| [03-genie-ai-requirements.md](03-genie-ai-requirements.md) | Genie/AI integration spec: Ask Genie modal, Generate Brief, Executive Insights, AI Genie chat (AI) |
| [04-data-requirements.md](04-data-requirements.md) | Synthetic data spec for Databricks: entities, schemas, volumes, calibration targets (DATA) |
| [05-traceability-coverage.md](05-traceability-coverage.md) | Coverage proof: every narration segment and visual element mapped to requirement IDs |
| [databricks-resource-requirements.md](databricks-resource-requirements.md) | User-supplied build resources: profile `9cefok`, catalog, React+FastAPI stack guidance, Genie MCP endpoint + tool contracts, Lakebase (Postgres) for app state |
| [assets/](assets/) | 8 key reference frames from the video (visual ground truth) |

Raw extraction materials (full transcript with timestamps, all 50 sampled frames + 4
scene-change frames) live in `../extraction/`.

## The product in one paragraph

**Monday Morning** is a CPG retail insights app for executives — the report you open Monday
morning before the week starts. The video demos the **01 Sales (Sales Performance)** page of a
multi-page suite (02 Demand, 03 Audience, 04 In-Store, 05 Measurement, Multi-Agent Genie,
Architecture appear in the nav but are not demoed). The Sales page has three tabs: **Executive
Summary** (KPI cards, AI-generated Executive Brief, trend + category charts, category management
KPIs, top movers / underperformers / new items, secondary KPIs, inventory health by store),
**Detailed Breakdown** (category → subcategory → SKU drill-down with a geographic store-comparison
map and AI Executive Insights), and **AI Genie** (a persistent chat with suggested questions where
every number on the page can be interrogated). Every KPI card, chart, and table carries an
**Ask Genie** button that opens a modal pre-loaded with a context-aware analytical prompt.

## Scope guardrails (from the narration)

- Build and deploy **on Databricks as a Databricks App** — non-negotiable.
- **Replicate the Sales Performance page** ("practically everything that you see in the screen").
- Other nav pages are **visible but out of scope** for the 30-minute build (render nav, stub or
  disable targets). SKU rows deep-link to a Demand page (`/app/demand/sku/SKU-#####`) — the link
  pattern must exist even if the page is stubbed.
- **Executive Insights** (Detailed Breakdown) is explicitly "add later if needed" — build last.
- **Genie MCP specifics will be provided separately** by the narrator — integrate behind an
  interface so the wiring can be swapped in.
- **All data is synthetic** ("we can make up the data") — generated on Databricks, calibrated to
  the on-screen values so the rebuilt app visually matches the reference.

## Coverage scorecard

Self-assessed against the goal "capture all of the requirements in that video" — see
[05-traceability-coverage.md](05-traceability-coverage.md) for the line-by-line proof.

| Dimension | Score |
|---|---|
| Narration: all 31 transcript segments mapped to requirements | 10/10 |
| Visuals: every distinct UI state (24 unique states across 54 frames reviewed) specified | 10/10 |
| On-screen data values captured for synthetic-data calibration | 10/10 |
| Ambiguities resolved & flagged (transcription artifacts, period mismatches) | 10/10 |
