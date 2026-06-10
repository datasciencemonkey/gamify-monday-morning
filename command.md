# Start clean → finished app (one paste)

From this folder (or any clone), paste this into your terminal:

```bash
cd ~/Documents/monday-morning-game && git fetch origin --tags -f && git checkout -f -B run/$(date +%m%d-%H%M) v2-clean-start && git clean -fd && claude "/goal Build and deploy the Monday Morning CPG Retail Insights app by invoking the monday-morning-build skill and following it exactly, using dynamic workflows for the component build. Deploy to Databricks Apps (profile 9cefok), pass all 8 acceptance criteria in BUILD-SPEC §6, and finish executive-ready in under 30 minutes. ultracode"
```

What it does: refreshes the (force-moved) tags, puts you on a fresh `run/<timestamp>` branch at
the clean checkpoint `v2-clean-start` (discarding any previous run's edits; ignored files like
`node_modules`, `.venv`, and the local video survive, so rebuilds stay fast), then launches
Claude with the goal that arms the stop hook and routes through the `monday-morning-build`
skill. ~18 minutes to a deployed, executive-ready app.

Fresh machine instead:

```bash
git clone https://github.com/datasciencemonkey/gamify-monday-morning.git && cd gamify-monday-morning && git checkout v2-clean-start && claude "/goal Build and deploy the Monday Morning CPG Retail Insights app by invoking the monday-morning-build skill and following it exactly, using dynamic workflows for the component build. Deploy to Databricks Apps (profile 9cefok), pass all 8 acceptance criteria in BUILD-SPEC §6, and finish executive-ready in under 30 minutes. ultracode"
```

Prereq either way: `databricks auth profiles | grep 9cefok` says YES (else
`databricks auth login https://fevm-serverless-9cefok.cloud.databricks.com --profile 9cefok`).
