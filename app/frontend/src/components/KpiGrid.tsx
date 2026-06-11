import { useEffect, useState } from 'react'
import { api, fmtMoney, fmtPct, type ExecKpis } from '../lib/api'
import { Card, AskGenie, Spinner, deltaClass } from './ui'

type KpiCard = {
  label: string
  value: string
  delta?: { text: string; cls: string }
  prompt: string
}

function buildCards(k: ExecKpis): KpiCard[] {
  return [
    {
      label: 'Total Sales',
      value: fmtMoney(k.total_sales),
      delta: { text: `${fmtPct(k.vs_plan)} vs plan`, cls: deltaClass(k.vs_plan) },
      prompt: `Total sales reached ${fmtMoney(k.total_sales)} (${fmtPct(k.vs_plan)} vs plan). Decompose the variance vs plan by category and store - show me the top 3 contributors and the top 3 detractors. For each detractor, recommend a specific corrective action.`,
    },
    {
      label: 'Comp Store Sales',
      value: fmtMoney(k.comp_sales),
      delta: { text: `${fmtPct(k.comp_yoy)} vs PY`, cls: deltaClass(k.comp_yoy) },
      prompt: `Comp store sales came in at ${fmtMoney(k.comp_sales)} (${fmtPct(k.comp_yoy)} vs PY). Decompose comp performance by region and store - show me the top 3 stores driving the gain and the 3 stores lagging the chain. For each laggard, recommend a specific action to lift comps next period.`,
    },
    {
      label: 'E-Commerce Sales',
      value: fmtMoney(k.ecom_sales),
      delta: { text: `${fmtPct(k.ecom_yoy, 0)} vs PY`, cls: deltaClass(k.ecom_yoy) },
      prompt: `E-commerce sales hit ${fmtMoney(k.ecom_sales)} (${fmtPct(k.ecom_yoy, 0)} vs PY). Decompose online growth by category - show me the top 3 categories over-indexing online and the 3 under-indexing versus their in-store share. For each under-indexed category, recommend a specific digital merchandising or fulfillment action.`,
    },
    {
      label: 'Transaction Count',
      value: k.transactions.toLocaleString(),
      prompt: `We recorded ${k.transactions.toLocaleString()} transactions this period. Decompose transaction volume by store and by category - show me the top 3 trip-driving stores and the 3 stores with the weakest counts. For each weak store, recommend a specific action to grow trips (promo cadence, local marketing, or assortment).`,
    },
    {
      label: 'In-Stock Rate',
      value: `${k.in_stock_rate}%`,
      prompt: `Chain-wide in-stock rate is ${k.in_stock_rate}%. Decompose availability by store and category - show me the 3 worst stores and 3 worst categories by in-stock rate, with estimated lost sales for each. For each, recommend a specific replenishment, allocation, or planogram fix.`,
    },
    {
      label: 'Gross Margin',
      value: `${k.gross_margin}%`,
      prompt: `Gross margin is running at ${k.gross_margin}%. Decompose margin by category - show me the top 3 margin-accretive categories and the top 3 margin-dilutive ones. For each dilutive category, recommend a specific pricing, mix, or promo-efficiency action to recover margin.`,
    },
    {
      label: 'Customer Traffic',
      value: k.customer_traffic.toLocaleString(),
      delta: { text: `${fmtPct(k.traffic_yoy)} vs PY`, cls: deltaClass(k.traffic_yoy) },
      prompt: `Customer traffic was ${k.customer_traffic.toLocaleString()} visits (${fmtPct(k.traffic_yoy)} vs PY). Decompose the traffic change by store and region - show me the 3 stores losing the most visits and the 3 gaining the most. For each declining store, recommend a specific traffic-driving action.`,
    },
    {
      label: 'On-Time Delivery',
      value: `${k.on_time_delivery}%`,
      prompt: `On-time delivery stands at ${k.on_time_delivery}%. Decompose late deliveries by region, store, and category - show me the 3 stores with the worst on-time rates and the categories most affected. For each, recommend a specific supply-chain corrective action (carrier, DC scheduling, or order lead time).`,
    },
  ]
}

export default function KpiGrid({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [kpis, setKpis] = useState<ExecKpis | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    api.execKpis()
      .then(d => { if (alive) setKpis(d) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  if (error) {
    return (
      <Card>
        <div className="px-5 py-8 text-center text-[12px] text-sub">KPI data is unavailable right now.</div>
      </Card>
    )
  }
  if (!kpis) {
    return (
      <Card>
        <Spinner label="Loading KPIs..." />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {buildCards(kpis).map(c => (
        <Card key={c.label} className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="metric-label">{c.label}</span>
            <AskGenie onAsk={() => openGenie(c.label, c.prompt)} />
          </div>
          <div className="text-[22px] font-extrabold mt-1 tracking-tight text-ink">{c.value}</div>
          {c.delta && <div className={`text-[11px] font-medium ${c.delta.cls}`}>{c.delta.text}</div>}
        </Card>
      ))}
    </div>
  )
}
