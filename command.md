# Start clean → finished app (one paste)

From this folder (or any clone), paste this into your terminal:

```bash
cd ~/Documents/monday-morning-game && git fetch origin --tags -f && git checkout -f -B run/$(date +%m%d-%H%M) v2-clean-start && git clean -fd && { databricks auth profiles 2>/dev/null | grep -q "9cefok.*YES" || databricks auth login https://fevm-serverless-9cefok.cloud.databricks.com --profile 9cefok; } && claude "/goal Build and deploy the Monday Morning CPG Retail Insights app by invoking the monday-morning-build skill and following it exactly, using dynamic workflows for the component build (if the Workflow tool is gated, dispatch the same component prompts from app/workflows/components.js as parallel subagents instead). Deploy to Databricks Apps (profile 9cefok), pass all 8 acceptance criteria in BUILD-SPEC §6, and finish executive-ready in under 30 minutes. Stamp wall-clock timestamps at T0 (first action), components-done, deploy-done, and goal-achieved, and append the run to build-times.md. ultracode"
```

What it does: refreshes the (force-moved) tags, puts you on a fresh `run/<timestamp>` branch at
the clean checkpoint `v2-clean-start` (discarding any previous run's edits; ignored files like
`node_modules`, `.venv`, and the local video survive, so rebuilds stay fast), then launches
Claude with the goal that arms the stop hook and routes through the `monday-morning-build`
skill. ~18 minutes to a deployed, executive-ready app.

Fresh machine instead:

```bash
git clone https://github.com/datasciencemonkey/gamify-monday-morning.git && cd gamify-monday-morning && git checkout v2-clean-start && claude "/goal Build and deploy the Monday Morning CPG Retail Insights app by invoking the monday-morning-build skill and following it exactly, using dynamic workflows for the component build (if the Workflow tool is gated, dispatch the same component prompts from app/workflows/components.js as parallel subagents instead). Deploy to Databricks Apps (profile 9cefok), pass all 8 acceptance criteria in BUILD-SPEC §6, and finish executive-ready in under 30 minutes. Stamp wall-clock timestamps at T0 (first action), components-done, deploy-done, and goal-achieved, and append the run to build-times.md. ultracode"
```

The local command checks `9cefok` auth first and opens SSO login if the token is stale, so
Claude always starts with working credentials. (The clone variant: run the same
`databricks auth login` line first if the profile isn't set up on that machine.)

Honest expectations: ~18 min measured (components ~12 min + deploy ~4 min + QA ~2 min).
Components are agent-built each run — a tsc/build fixer guarantees they compile, and the skill's
gotcha list covers the known platform hiccups (e.g. a rare "update in progress" lock = retry).
Run history with phase breakdowns lives in `build-times.md` (rides in the checkpoint); the goal
makes each run append its own row, so the log accumulates across runs.
