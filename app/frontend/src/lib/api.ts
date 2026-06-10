// Typed API client - shapes mirror backend/metrics.py exactly.
export type ExecKpis = {
  total_sales: number; vs_plan: number; comp_sales: number; comp_yoy: number;
  ecom_sales: number; ecom_yoy: number; transactions: number; in_stock_rate: number;
  gross_margin: number; customer_traffic: number; traffic_yoy: number; on_time_delivery: number;
}
export type TrendPoint = { month: string; sales: number }
export type CategorySales = { category: string; sales: number }
export type CategoryKpi = {
  category: string; growth_vs_market_pp: number; trip_conversion_pct: number;
  basket_attach_pct: number; dollars_per_linear_foot: number; planogram_compliance_pct: number;
  new_items_launched: number; new_items_successful: number;
}
export type MoverRow = { product_name: string; category: string; sales: number; pct: number; sku_id: string }
export type Movers = { top_movers: MoverRow[]; underperformers: MoverRow[]; new_items: MoverRow[] }
export type Secondary = {
  avg_basket: number; avg_items: number; conversion_rate: number; nps: number;
  private_label_pct: number; case_fill_rate: number; otif: number;
}
export type InventoryRow = {
  store_name: string; region: string; in_stock_pct: number; nil_picks: number; days_supply: number;
}
export type SkuRow = {
  product_name: string; subcategory: string; category: string; upc: string; sku_id: string;
  sales: number; units: number; vs_plan: number; vs_py: number; margin: number;
  promo_lift: number; trip_conv: number; basket_att: number; dpl: number; new_pct: number;
  in_stock: number; dos: number;
}
export type SubcatRow = Omit<SkuRow, 'upc' | 'sku_id' | 'product_name'> & { skus: SkuRow[] }
export type CategoryRow = Omit<SubcatRow, 'skus' | 'subcategory'> & { category: string; subcategories: SubcatRow[] }
export type StoreComp = {
  level: string; name: string;
  stores: { store_name: string; city: string; state: string; latitude: number; longitude: number;
            sales: number; units: number; in_stock: number | null; on_hand: number | null }[];
  top_store: { store_name: string; sales: number; share: number } | null;
}
export type BriefChip = { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }
export type Brief = { headline: string; detail: string; chips: BriefChip[]; provenance: string }
export type GenieResp = {
  status: 'in_progress' | 'completed' | 'failed' | 'incomplete';
  conversation_id?: string; response_id?: string; deep_link?: string;
  progress_steps: string[]; final_answer?: string; content: string; error?: string;
}
export type Conversation = { conversation_id: string; title: string; genie_conversation_id?: string | null }
export type ChatMessage = { role: 'user' | 'assistant'; content: string }

const j = async <T,>(r: Response): Promise<T> => {
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}
export const api = {
  execKpis: () => fetch('/api/metrics/exec-kpis').then(r => j<ExecKpis>(r)),
  trend: () => fetch('/api/metrics/trend').then(r => j<TrendPoint[]>(r)),
  categorySales: () => fetch('/api/metrics/category-sales').then(r => j<CategorySales[]>(r)),
  categoryKpis: () => fetch('/api/metrics/category-kpis').then(r => j<CategoryKpi[]>(r)),
  movers: () => fetch('/api/metrics/movers').then(r => j<Movers>(r)),
  secondary: () => fetch('/api/metrics/secondary').then(r => j<Secondary>(r)),
  inventory: () => fetch('/api/metrics/inventory').then(r => j<InventoryRow[]>(r)),
  drilldown: () => fetch('/api/metrics/drilldown').then(r => j<CategoryRow[]>(r)),
  storeComparison: (level: string, name: string) =>
    fetch(`/api/metrics/store-comparison?level=${level}&name=${encodeURIComponent(name)}`).then(r => j<StoreComp>(r)),
  brief: () => fetch('/api/brief', { method: 'POST' }).then(r => j<Brief>(r)),
  suggested: () => fetch('/api/suggested-questions').then(r => j<string[]>(r)),
  genieAsk: (question: string, conversation_id?: string | null) =>
    fetch('/api/genie/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, conversation_id }) }).then(r => r.json() as Promise<GenieResp>),
  geniePoll: (conversation_id: string, response_id: string) =>
    fetch('/api/genie/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id, response_id }) }).then(r => r.json() as Promise<GenieResp>),
  conversations: () => fetch('/api/chat/conversations').then(r => j<Conversation[]>(r)),
  newConversation: (title: string) =>
    fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }) }).then(r => j<{ conversation_id: string }>(r)),
  messages: (cid: string) => fetch(`/api/chat/messages?cid=${encodeURIComponent(cid)}`).then(r => j<ChatMessage[]>(r)),
  saveMessage: (conversation_id: string, role: string, content: string, genie_conversation_id?: string | null) =>
    fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id, role, content, genie_conversation_id }) }).then(r => j<{ ok: boolean }>(r)),
}
export const fmtMoney = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${v.toFixed(0)}`
export const fmtPct = (v: number, dp = 1) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(dp)}%`
