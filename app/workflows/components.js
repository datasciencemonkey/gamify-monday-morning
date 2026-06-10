export const meta = {
  name: 'monday-morning-components',
  description: 'Parallel build of 7 dashboard component clusters + tsc/build fixer',
  phases: [
    { title: 'Components', detail: '7 agents, one per DASH cluster' },
    { title: 'Typecheck & Build', detail: 'fix residual type errors, produce dist' },
  ],
}

const ROOT = '/Users/sathish.gangichetty/Documents/monday-morning-game'
const FE = ROOT + '/app/frontend'

const COMMON = `You are building one component cluster of the "Monday Morning - CPG Retail Insights" executive dashboard (React 19 + TypeScript strict + Tailwind v4). Repo root: ${ROOT}.

MANDATORY first reads (use Read tool):
1. ${FE}/src/lib/api.ts  - typed API client; consume data ONLY via these functions/types. NEVER hardcode metric values.
2. ${FE}/src/components/ui.tsx - primitives: Card, SectionHeader, AskGenie, Spinner, GenieIcon, toneClass, deltaClass.
3. ${FE}/src/App.tsx - exactly how your component is mounted; keep the same default-export name + prop signature.
4. Your DASH spec section in ${ROOT}/requirements/02-dashboard-requirements.md.
5. Your reference screenshot(s) in ${ROOT}/requirements/assets/ (Read the jpg - match it closely).

Design grammar (executive-grade, match the screenshots): page bg is cream (body), sections are white .card with hairline border (border-line), small-caps 11px labels via .metric-label, 12-13px body type, values bold/extrabold, red accent text-brand/#e0312b, positive deltas tone-good green / negatives tone-bad red, amber text-warn, generous px-5 padding, rounded-xl. Tailwind theme colors available: cream, card, line, ink, sub, brand, good, bad, warn, genie.

Rules:
- Replace your assigned file(s) ENTIRELY with production code (they currently contain stubs).
- Touch NOTHING else. Do not edit ui.tsx, api.ts, App.tsx, index.css, or other components.
- Allowed imports: react, recharts, leaflet, react-leaflet, lucide-react, '../lib/api', './ui'. No new packages.
- Every data fetch: loading state <Spinner label="..."/>; on error render a muted fallback (never crash).
- TypeScript strict + noUnusedLocals: no unused vars, avoid any.
- Do NOT run project-wide tsc/build (other agents are writing files concurrently). You may use Bash for file ops only.
- Numbers: use fmtMoney/fmtPct from api.ts where appropriate; toLocaleString for counts.
`

const AI1 = `Ask Genie prompts (AI-1 pattern): each Ask Genie button calls openGenie(title, prompt) where prompt interpolates LIVE values and follows: state the fact -> decompose -> top contributors/detractors -> specific corrective action. Canonical example (Total Sales): "Total sales reached $2.4M (-11.2% vs plan). Decompose the variance vs plan by category and store - show me the top 3 contributors and the top 3 detractors. For each detractor, recommend a specific corrective action."`

phase('Components')
const SCHEMA = { type: 'object', properties: { files: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['files', 'summary'] }

const results = await parallel([
  () => agent(COMMON + AI1 + `
YOUR FILE: ${FE}/src/components/KpiGrid.tsx (screenshot: assets/01-executive-summary-top.jpg, spec DASH-3).
Build the 8 KPI cards, 2 rows x 4 (grid grid-cols-4 gap-4). Data: api.execKpis(). Card anatomy: .metric-label label top-left + <AskGenie> top-right, value text-[22px] font-extrabold mt-1, optional delta line text-[11px] font-medium.
Cards in order: TOTAL SALES fmtMoney(total_sales) delta "{fmtPct(vs_plan)} vs plan" (red, vs_plan<0) | COMP STORE SALES fmtMoney(comp_sales) "{fmtPct(comp_yoy)} vs PY" green | E-COMMERCE SALES fmtMoney(ecom_sales) "{fmtPct(ecom_yoy,0)} vs PY" green | TRANSACTION COUNT transactions.toLocaleString() no delta | IN-STOCK RATE "{in_stock_rate}%" | GROSS MARGIN "{gross_margin}%" | CUSTOMER TRAFFIC customer_traffic.toLocaleString() delta "{fmtPct(traffic_yoy)} vs PY" red | ON-TIME DELIVERY "{on_time_delivery}%".
Each card's Ask Genie: openGenie("<KPI name>", <AI-1 prompt with that KPI's live values>). Write distinct, thoughtful prompts per KPI.`, { label: 'kpi-cards', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILE: ${FE}/src/components/ExecutiveBrief.tsx (screenshot: assets/03-executive-brief-rendered.jpg, spec DASH-4; idle state also visible in 01-executive-summary-top.jpg).
Three states. IDLE: row with GenieIcon + "Executive Brief" (text-[13px] font-bold) and helper copy 'Click <b>Generate Brief</b> to have Genie polish the current-period KPIs into a 2-3 sentence executive summary with KPI chips.' (text-[12px] text-sub); right: red button "Generate Brief" (bg-brand text-white text-[12px] font-semibold rounded-lg px-3.5 py-1.5 with Sparkles icon, hover:opacity-90). GENERATING: button becomes soft pill (bg-brand/15 text-brand) with spinning border icon + "Generating…"; keep min 1200ms so the state is visible. DONE (api.brief() -> Brief): headline paragraph text-[13px] leading-relaxed; then chips row (flex flex-wrap gap-2): each chip rounded-md border px-2.5 py-1.5, .metric-label tiny label + value text-[13px] font-bold; tone via chip.tone: good = border-good/40 bg-good/5 text-good value, bad = border-bad/40 bg-bad/5 text-bad, neutral = border-line; then detail paragraph text-[12px] text-ink/85 leading-relaxed; then provenance italic text-[11px] text-sub border-t border-line pt-2 mt-3.`, { label: 'exec-brief', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILES: ${FE}/src/components/TrendChart.tsx and ${FE}/src/components/CategoryDonut.tsx (screenshot: assets/01-executive-summary-top.jpg, spec DASH-5/6). Use recharts.
TrendChart: Card + SectionHeader "Monthly Sales Trend" + AskGenie (openGenie with a prompt about the monthly trend/dip). api.trend() -> [{month:'2025-01',sales}]. ResponsiveContainer height 256; AreaChart: Area type="monotone" dataKey sales, stroke #e0312b strokeWidth 2, fill rgba(224,49,43,0.09), dot false, isAnimationActive. XAxis: month formatted to m.slice(5) ('01'..'12'), tickLine false, axisLine false, fontSize 10, stroke #6b675f. YAxis ticks [0,650000,1300000,1900000,2600000] domain [0,2600000] tickFormatter fmtMoney, same muted style. CartesianGrid horizontal only stroke #eee9df. Custom Tooltip: white bordered card, line1 month (mono 10px), line2 "Sales: {fmtMoney}" red 11px bold.
CategoryDonut: Card + SectionHeader "Sales by Category" + AskGenie (prompt about category mix and Food Storage decline). api.categorySales(). PieChart Pie innerRadius 58 outerRadius 96 paddingAngle 1 dataKey sales nameKey category isAnimationActive; Cell colors exactly: Food Storage #e0312b, Pest Control #8f1d16, Air Care #e8a13d, Home Cleaning #169a53, Shoe Care #2f6fed. Labels with leader lines showing "{category} {fmtMoney(sales)}" (custom label fn, fontSize 10, fill matches segment color); centered empty donut hole. Height 256.`, { label: 'charts', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILES: ${FE}/src/components/CategoryKpisTable.tsx, ${FE}/src/components/MoversCards.tsx, ${FE}/src/components/SecondaryKpis.tsx (screenshot: assets/04-category-kpis-movers.jpg, specs DASH-7/8/9).
CategoryKpisTable: Card + SectionHeader "Category Management KPIs" + AskGenie. api.categoryKpis(). Table w-full text-[12px]: header row .metric-label text-left/right cells (CATEGORY | GROWTH VS MARKET | TRIP CONV. | BASKET ATTACH | $/LIN FT | PLANO COMP. | NEW ITEM SUCCESS), rows border-t border-line py-2.5: category font-medium; growth "+{x}pp" tone-good; trip/basket "{x}%"; $/lin ft "$ {int}"; plano "{x}%"; new item success "{successful}/{launched} ({round(successful/launched*100)}%)". Numeric columns right-aligned, header bg subtle (bg-cream/60).
MoversCards: grid grid-cols-3 gap-4; three Cards: "Top Movers" (top_movers, pct green "+{pct}%"), "Underperformers" (underperformers, pct red "{pct}%" no plus), "New Items" (new_items, pct green "+{pct}%"). Each: SectionHeader title + AskGenie (distinct prompts). 5 rows each: left name text-[12px] font-semibold + category text-[11px] text-sub below; right fmtMoney(sales) font-bold text-[12px] + pct text-[11px] below right-aligned. Rows hover:bg-cream/70 rounded px-2 -mx-2 cursor-pointer, divide-y divide-line/70.
SecondaryKpis: grid grid-cols-4 gap-4, four KPI cards (same anatomy as DASH-3 cards: .metric-label + AskGenie, value text-[20px] font-extrabold, sub-line text-[11px] text-sub). api.secondary(): AVG BASKET SIZE "$"+avg_basket / "{avg_items} avg items per transaction" | CONVERSION RATE "{conversion_rate}%" / "NPS Score: {nps}" | PRIVATE LABEL "{private_label_pct}%" / "of total sales" | CASE FILL RATE "{case_fill_rate}%" / "OTIF: {otif}%".`, { label: 'tables-movers', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILE: ${FE}/src/components/InventoryTable.tsx (screenshot: assets/05-inventory-health-by-store.jpg, spec DASH-10).
Card + SectionHeader "Inventory Health by Store" + AskGenie (prompt about in-stock risk by store). api.inventory() (already sorted ascending by in_stock_pct). Table text-[12px]: header .metric-label (STORE | REGION | IN-STOCK % | NIL PICKS | DAYS SUPPLY) with subtle bg-cream/60; rows border-t border-line, py-2.5: store font-medium, region text-sub; IN-STOCK % color rule: <80 tone-bad, 80-81.9 text-warn, else text-ink; NIL PICKS plain; DAYS SUPPLY tone-bad when <=4.9. Numeric right-aligned.`, { label: 'inventory', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILES: ${FE}/src/components/DrilldownTable.tsx and ${FE}/src/components/StoreComparison.tsx (screenshots: assets/06-sku-drilldown-expanded.jpg + assets/07-executive-insights-full.jpg top half, specs DASH-12/13).
DrilldownTable (owns selection state; renders StoreComparison below itself):
- Heading above table: "Category → Subcategory → SKU Drill-Down" text-[15px] font-bold mb-3.
- api.drilldown() -> CategoryRow[] tree. Card with table text-[11.5px]; 15 columns: NAME | UPC | SALES | UNITS | VS PLAN | VS PY | MARGIN | IN-STOCK | DOS | PROMO LIFT | TRIP CONV | BASKET ATT. | $/LIN FT | NEW ITEM % | (blank for action). Header .metric-label bg-cream/60.
- Category rows: caret ChevronRight/ChevronDown text-brand + bold name; click toggles expand AND selects it (level='category'). Subcategory rows: indented pl-6, caret text-genie, click toggles skus AND selects (level='subcategory'). SKU leaf rows: pl-12, name; upc mono text-[10.5px] text-sub in UPC col; last col: small "Demand →" button (border border-brand/50 text-brand rounded px-1.5 py-0.5 text-[10px] hover:bg-brand/5, href '#/demand/sku/'+sku_id as <a>).
- Formatting: SALES fmtMoney, UNITS toLocaleString, VS PLAN fmtPct tone-bad, VS PY fmtPct tone-good, MARGIN/IN-STOCK/PROMO/TRIP/BASKET/NEW "{x}%", IN-STOCK tone-bad when <80.5, DOS one decimal, $/LIN FT "$"+dpl. Selected row bg-cream/80.
- Default selection: first category. Below the table render <StoreComparison level={sel.level} name={sel.name} key={sel.level+sel.name}/>.
StoreComparison({level, name}): api.storeComparison(level, name). Card:
- Header: MapPin (lucide, text-brand) + "Store comparison — {name}" font-bold text-[13px]; subtitle "{level === 'category' ? 'Category' : 'Subcategory'} · current month sales across all 15 stores" text-[11px] text-sub. Right side: "Top store" .metric-label + top_store.store_name font-bold text-[12px] + "{fmtMoney(sales)} · {share}% of total" text-[11px] text-sub.
- Body grid grid-cols-2 gap-5 px-5 pb-5: LEFT: caption "GEOGRAPHIC DISTRIBUTION (NY/NJ/CT)" .metric-label + inline legend (dots: ≥90% stock good, 80–90% warn, <80% bad, text-[10px]); MapContainer center [40.83,-73.95] zoom 9 h-72 w-full scrollWheelZoom false; TileLayer url https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png attribution '© OSM contributors'; per store CircleMarker center [latitude, longitude] radius 6+14*sqrt(sales/maxSales), pathOptions: color/fillColor by in_stock band (>=90 #169a53, >=80 #e8a13d, else #e0312b), fillOpacity 0.75, weight 1; Tooltip = store_name; Popup: name bold, "{city}, {state}" sub, then "Sales: {fmtMoney}", "Units: {toLocaleString}", "In-stock: {x}%", "On-hand: {n}" as small lines.
- RIGHT: caption "SALES BY STORE (SORTED)" .metric-label; pure-div horizontal bars for each store (already sorted desc): row flex items-center gap-2 mb-1.5: store_name w-32 text-right text-[10px] text-sub truncate, bar div h-3.5 rounded-r bg-brand with width pct of max (min 4%), title attr "{store_name} — Sales: {fmtMoney}", hover:opacity-80.
- Loading: <Spinner label="Loading store comparison..."/>. react-leaflet imports: MapContainer, TileLayer, CircleMarker, Tooltip, Popup from 'react-leaflet'.`, { label: 'drilldown-map', phase: 'Components', schema: SCHEMA }),

  () => agent(COMMON + `
YOUR FILES: ${FE}/src/components/AskGenieModal.tsx and ${FE}/src/components/GenieTab.tsx (screenshots: assets/02-ask-genie-modal.jpg + assets/08-ai-genie-chat-tab.jpg, specs DASH-11/15, AI-1/AI-4).
Genie call flow (both files): api.genieAsk(question, genieConversationId?) -> GenieResp. If status==='in_progress', poll api.geniePoll(conversation_id, response_id) every 3s (async loop with cancellation on unmount/close) until status!=='in_progress'. While polling show animated typing dots (three pulsing dots) + latest progress_steps entry as italic text-[10.5px] text-sub line. On completed: render the markdown-ish 'content' (fallback final_answer): implement ONE shared lightweight renderer exported from AskGenieModal.tsx (export function GenieMarkdown({text}:{text:string})): split lines; render **bold** spans, [label](url) as <a class="text-genie underline" target="_blank">, lines starting with '|' grouped into a simple bordered table, '##'/'###' headings as font-bold text-[12.5px], skip '<!--' comment lines and '<details>' blocks; everything else whitespace-pre-wrap text-[12px]. On failed: muted error card "Genie is unavailable right now."
AskGenieModal (KEEP EXACT EXPORTS: export type GenieCtx = { title: string; prompt: string }; default fn ({ctx, onClose})): when ctx non-null: fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-start justify-center pt-24, onClick backdrop closes; panel Card w-[600px] max-h-[68vh] flex flex-col shadow-2xl: header px-4 py-3 border-b border-line flex justify-between: GenieIcon + "Ask Genie: {ctx.title}" text-[12.5px] font-bold; X button (lucide X size 15, text-sub hover:text-ink). Body overflow-y-auto px-4 py-3 space-y-3: auto-send ctx.prompt on open -> indigo user bubble (bg-genie text-white text-[12px] rounded-lg p-3 leading-relaxed); then typing/answer per flow above; answer in bordered white bubble. Footer border-t border-line p-3 flex gap-2: input flex-1 border border-line rounded-lg px-3 py-2 text-[12px] outline-genie placeholder "Ask a follow-up question…", send icon button (lucide SendHorizonal, bg-genie/90 text-white rounded-lg px-3, disabled while polling); follow-ups reuse conversation_id from first response. Reset all state when ctx changes/closes.
GenieTab (no props): grid grid-cols-[230px_1fr_270px] gap-4 h-[600px].
- LEFT Card flex flex-col p-3: "+ New Chat" full-width border border-line rounded-lg py-2 text-[12px] font-medium hover:border-ink/40 (lucide Plus size 13); then "HISTORY · MONDAY MORNING" .metric-label mt-4 mb-2; api.conversations() -> list (initial "Loading history…" sub text); empty -> centered "No previous chats yet" text-[11px] text-sub mt-8; items: truncated title text-[11.5px] p-2 rounded hover:bg-cream cursor-pointer (active bg-cream font-medium); clicking loads api.messages(cid) into center.
- CENTER Card flex flex-col: header px-4 py-3 border-b border-line flex items-center justify-between: GenieIcon + "Ask Genie · Monday Morning" text-[13px] font-bold; right text-[10px] text-sub "🗂 Sales room · sales · margin · inventory · e-commerce". Body flex-1 overflow-y-auto px-4 py-3 space-y-3; empty state centered mt-24: "Ask Genie" text-[15px] font-bold + "Click a suggested question or type your own below" text-[12px] text-sub. Messages: user = indigo bubble (as modal), assistant = white bordered bubble w/ GenieMarkdown. Footer p-3 border-t border-line flex gap-2: input flex-1 (same style) placeholder "Ask a question about your CPG data…" + red Ask button bg-brand text-white rounded-lg px-4 py-2 text-[12px] font-semibold flex items-center gap-1 (SendHorizonal size 13) disabled while busy.
- Ask flow: if no active conversation -> api.newConversation(question.slice(0,48)) first; api.saveMessage(cid,'user',question); genieAsk with stored genie conversation_id (continuity across turns: keep response.conversation_id, pass it on follow-ups AND save via saveMessage genie_conversation_id param); poll; on complete saveMessage(cid,'assistant', content).
- RIGHT Card p-3 overflow-y-auto: "SUGGESTED QUESTIONS" .metric-label mb-2; api.suggested() (initial "Loading…"); each question a bordered rounded-lg p-2.5 text-[11px] leading-snug hover:border-genie/60 hover:bg-genie/5 cursor-pointer mb-2; click triggers the ask flow with that question.`, { label: 'genie-surfaces', phase: 'Components', schema: SCHEMA }),
])

const done = results.filter(Boolean)
log(`components complete: ${done.length}/7 — ${done.flatMap(r => r.files).length} files`)

phase('Typecheck & Build')
const fix = await agent(`You are the integration fixer for the Monday Morning dashboard frontend at ${FE} (React 19 + TS strict + Tailwind v4 + Vite).
All component files in ${FE}/src/components/ were just written by parallel agents. Your job:
1. cd ${FE} && npx tsc --noEmit -p tsconfig.app.json — fix EVERY type error you find by editing the offending component files (imports, types, unused vars, recharts/react-leaflet typings). Keep each component's visual design and logic intact — minimal surgical fixes only. Do not change api.ts/ui.tsx/App.tsx unless a type error genuinely originates there.
2. Repeat until tsc is clean.
3. Then npm run build (vite build). Fix any build errors the same way until it succeeds.
4. Confirm ${FE}/dist/index.html exists.
Return JSON {tsc_clean, build_ok, fixes: [short descriptions]}.`,
  { label: 'tsc-build-fixer', phase: 'Typecheck & Build',
    schema: { type: 'object', properties: { tsc_clean: { type: 'boolean' }, build_ok: { type: 'boolean' }, fixes: { type: 'array', items: { type: 'string' } } }, required: ['tsc_clean', 'build_ok', 'fixes'] } })

return { components: done.map(r => r.summary), build: fix }