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

- **Don't regenerate or modify data** — `serverless_9cefok_catalog.monday_morning` is loaded and
  verified. Regeneration (`cd data && uv run python generate.py`) only if the schema is damaged.
- **Don't edit** `requirements/`, `BUILD-SPEC.md`, `data/`, or `extraction/` during a build run.
- Databricks: always `--profile 9cefok`. Genie via the MCP endpoint in BUILD-SPEC §1 (validated).
- Python: always run through `uv`. Git commits as `datasciencemonkey@gmail.com`.
- The bar is **executive-ready visual quality** — match `requirements/assets/` design grammar.

## Reset between runs

`git reset --hard v0-baseline-data-ready && git clean -fd` returns the repo to the pristine
pre-build state (UC data and untracked media survive). Re-runnable any number of times.
