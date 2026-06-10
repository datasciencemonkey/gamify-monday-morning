# Monday Morning — CPG Retail Insights (conference demo)

A Databricks App rebuilt **live in under 30 minutes** at a conference. All inputs are prepared;
a build session's only job is the app itself.

## Start here

1. **Invoke the project skill `monday-morning-build`** (`.claude/skills/monday-morning-build/`)
  — full runbook, environment constants, and every known gotcha. Fastest correct path.
2. **Read `BUILD-SPEC.md`** — the build mission: environment, stack, data contracts,
  AI integration, acceptance criteria (§6).
3. Canonical specs live in `requirements/` (DASH/AI/FR IDs) with reference screenshots in
  `requirements/assets/`. Treat them as read-only ground truth.

## Suggested kickoff for a build session

Run a goal that names the skill (the skill is the *how*; the goal is the *enforcement* — the
session cannot stop until the condition holds):

```
/goal Build and deploy the Monday Morning CPG Retail Insights app by invoking the
monday-morning-build skill and following it exactly, using dynamic workflows for the
component build. Deploy to Databricks Apps (profile 9cefok), pass all 8 acceptance criteria
in BUILD-SPEC §6, and finish executive-ready in under 30 minutes. ultracode
```

Saying just "monday morning build" also works (CLAUDE.md routes there), but you lose the
stop-hook guarantee that the session finishes the job.

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
- **Deploys always delete + re-import**: `databricks workspace delete <ws-path> --recursive` then
  `databricks workspace import-dir <stage> <ws-path>` before `databricks apps deploy` (see
  `app/deploy.sh`). Never incremental-sync over an existing source folder.
- The deployed app's AI path is the **Genie MCP** (workspace endpoint in BUILD-SPEC §1) with
  user-authorization scopes `sql` + `dashboards.genie` on the app (OBO; users consent on first open).

## Starting a build session (two equally valid entry points)

**A) From this existing local folder** (common case): everything is already here — verify the
`9cefok` profile is valid, make sure you're at the pristine baseline (`git status` clean on
`main`; if a previous run left work behind, reset per "Run hygiene & reset" below), then paste
the /goal block above.

**B) From a fresh machine/folder:**

```
git clone https://github.com/datasciencemonkey/gamify-monday-morning.git
cd gamify-monday-morning
databricks auth profiles | grep 9cefok   # login if not YES (see Hard rules)
```

Then paste the /goal block above.

Either way the start point is identical: `main` = pristine baseline (tag
`v0-baseline-data-ready`). Note for local starts: `quick-brief.mov` and `extraction/` media are
untracked extras that exist only locally — ignore them; no build step needs them.

## Run hygiene & reset

- Do build work on a branch per run (`git checkout -b run/<name>`) and push the branch if you
want to keep it. **Never push build output to `main`** — main stays the start point.
- Reset locally between runs: `git reset --hard v0-baseline-data-ready && git clean -fd`
(UC data and untracked media survive). Or just re-clone. Re-runnable any number of times.

