# Monday Morning — CPG Retail Insights (conference demo)

A Databricks App rebuilt **live in under 30 minutes** at a conference. All inputs are prepared;
a build session's only job is the app itself.

## Start here

1. **Read `BUILD-SPEC.md`** — the complete build mission: environment, stack, data contracts,
   AI integration, 30-minute plan, acceptance criteria.
2. Canonical specs live in `requirements/` (DASH/AI/FR IDs) with reference screenshots in
   `requirements/assets/`. Treat them as read-only ground truth.

## Suggested kickoff for a build session

Run a goal with dynamic workflows:

```
/goal Build and deploy the Monday Morning CPG Retail Insights app exactly per BUILD-SPEC.md,
using dynamic workflows to parallelize component builds. Deploy to Databricks Apps (profile
9cefok), pass all 8 acceptance criteria in BUILD-SPEC §6, and finish executive-ready in under
30 minutes.
```

## Hard rules

- **First action of any session:** `databricks auth profiles | grep 9cefok` must show `YES`.
  If not, ask the user to run
  `! databricks auth login https://fevm-serverless-9cefok.cloud.databricks.com --profile 9cefok`
  and wait — nothing works without it.

- **Don't regenerate or modify data** — `serverless_9cefok_catalog.monday_morning` is loaded and
  verified. Regeneration (`cd data && uv run python generate.py`) only if the schema is damaged.
- **Don't edit** `requirements/`, `BUILD-SPEC.md`, `data/`, or `extraction/` during a build run.
- Databricks: always `--profile 9cefok`. Genie via the MCP endpoint in BUILD-SPEC §1 (validated).
- Python: always run through `uv`. Git commits as `datasciencemonkey@gmail.com`.
- The bar is **executive-ready visual quality** — match `requirements/assets/` design grammar.

## Starting from the remote (fresh machine or session)

```
git clone https://github.com/datasciencemonkey/gamify-monday-morning.git
cd gamify-monday-morning
databricks auth profiles | grep 9cefok   # login if not YES (see Hard rules)
```
Then paste the /goal block above. The clone IS the start point — `main` is the pristine
baseline (tag `v0-baseline-data-ready`).

## Run hygiene & reset

- Do build work on a branch per run (`git checkout -b run/<name>`) and push the branch if you
  want to keep it. **Never push build output to `main`** — main stays the start point.
- Reset locally between runs: `git reset --hard v0-baseline-data-ready && git clean -fd`
  (UC data and untracked media survive). Or just re-clone. Re-runnable any number of times.
