export const meta = {
  name: 'monday-morning-critique',
  description: 'Spec-congruence critique: acceptance audit, visual fidelity, DASH sweep',
  phases: [{ title: 'Critique', detail: '3 parallel reviewers' }],
}

const ROOT = '/Users/sathish.gangichetty/Documents/monday-morning-game'
const SHOTS = 'Built-app screenshots (Read these): /tmp/mm-exec-brief.png (exec top + rendered brief), /tmp/mm-exec-full.png (full exec page), /tmp/mm-modal.png (Ask Genie modal), /tmp/mm-drilldown.png (Detailed Breakdown + map), /tmp/mm-genie-tab.png (AI Genie tab), /tmp/mm-genie-answer.png (Genie answer rendered in chat).'
const REFS = `Reference design screenshots: ${ROOT}/requirements/assets/*.jpg (8 files - Read the relevant ones).`

phase('Critique')
const out = await parallel([
  () => agent(`You are the ACCEPTANCE AUDITOR for the Monday Morning app build.
Read ${ROOT}/BUILD-SPEC.md section 6 (8 acceptance criteria). ${SHOTS}
Evidence you may also use: deployed app URL https://monday-morning-7474645105283837.aws.databricksapps.com is RUNNING (verified: /api/health ok, /api/metrics/exec-kpis returns total_sales 2401623 via OBO, index serves the React app). Local verification already showed: Bags & Wraps expands to 4 SKUs with UPCs + 4 'Demand →' links; selecting it rebinds 'Store comparison — Bags & Wraps'; the 10 suggested questions render; a suggested question produced a grounded Genie answer with tables + Explore in Databricks link (see /tmp/mm-genie-answer.png).
You may also Read code under ${ROOT}/app/ and run read-only Bash checks (curl localhost:8000, grep code) to gather evidence. The local app at http://localhost:8000 is running.
For EACH of the 8 criteria: verdict PASS/PARTIAL/FAIL + one-line evidence. Note: criterion 5 says insights '(if built)' - Executive Insights (DASH-14) was explicitly optional/build-last per FR-13 and was NOT built; judge criterion 5 on map+bars rebinding only.
Return JSON.`, { label: 'acceptance-audit', phase: 'Critique',
      schema: { type: 'object', properties: { criteria: { type: 'array', items: { type: 'object', properties: { n: { type: 'number' }, verdict: { type: 'string' }, evidence: { type: 'string' } }, required: ['n', 'verdict', 'evidence'] } }, overall: { type: 'string' } }, required: ['criteria', 'overall'] } }),

  () => agent(`You are the VISUAL FIDELITY CRITIC (executive-readiness is the single most important bar - BUILD-SPEC criterion 8).
${SHOTS} ${REFS}
Compare side by side: 01-executive-summary-top.jpg vs mm-exec-brief/full; 02-ask-genie-modal.jpg vs mm-modal; 03-executive-brief-rendered.jpg vs mm-exec-brief; 04/05 vs mm-exec-full; 06 vs mm-drilldown; 08 vs mm-genie-tab.
Judge: layout structure, typography scale/weight, color discipline (cream bg, white cards, red accent, green/red deltas, amber), spacing/density, chart styling (trend line + donut labels), table styling, overall executive polish.
Score each screen 1-10 vs reference, list concrete deltas (worst first) with the CSS-level fix for each. Distinguish MUST-FIX (visibly wrong, an exec would notice) from NICE (minor polish). Return JSON.`, { label: 'visual-critic', phase: 'Critique',
      schema: { type: 'object', properties: { screens: { type: 'array', items: { type: 'object', properties: { screen: { type: 'string' }, score: { type: 'number' }, deltas: { type: 'array', items: { type: 'string' } } }, required: ['screen', 'score', 'deltas'] } }, must_fix: { type: 'array', items: { type: 'string' } }, nice: { type: 'array', items: { type: 'string' } } }, required: ['screens', 'must_fix', 'nice'] } }),

  () => agent(`You are the SPEC-CONGRUENCE REVIEWER. Sweep ${ROOT}/requirements/02-dashboard-requirements.md sections DASH-1 through DASH-15 (skip DASH-14 Executive Insights - explicitly deferred) plus ${ROOT}/requirements/03-genie-ai-requirements.md AI-1/AI-2/AI-4, and verify each spec item against the implementation: Read the component code in ${ROOT}/app/frontend/src/ (App.tsx + components/) and backend in ${ROOT}/app/backend/. ${SHOTS}
Check items like: nav structure + labels, Live pill, tab styling (AI Genie amber when active), KPI card anatomy + exact labels, brief card copy + chip set, chart axes/ticks/colors, table columns + exact headers + color rules, modal anatomy + auto-sent prompt pattern, genie tab 3-pane layout + context tags + history states, suggested questions list, loading states, deep-link Demand buttons, UPC rendering.
Report ONLY discrepancies (spec item -> what the implementation does instead -> severity high/med/low). Be precise and cite the spec line. Return JSON.`, { label: 'dash-sweep', phase: 'Critique',
      schema: { type: 'object', properties: { discrepancies: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, actual: { type: 'string' }, severity: { type: 'string' } }, required: ['item', 'actual', 'severity'] } }, congruent: { type: 'string' } }, required: ['discrepancies', 'congruent'] } }),
])

const [audit, visual, sweep] = out
return { audit, visual, sweep }