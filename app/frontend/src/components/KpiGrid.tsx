import { useEffect, useState } from 'react'
import { api, fmtMoney, fmtPct, type ExecKpis } from '../lib/api'
import { Card, AskGenie, Spinner, deltaClass } from './ui'

type KpiCard = {
  label: string
  value: string
  delta?: { text: string; v: number }
  genieTitle: string
  geniePrompt: string
}

function buildCards(k: ExecKpis): KpiCard[] {
  return [
    {
      label: 'Total Sales',
      value: fmtMoney(k.total_sales),
      delta: { text: `${fmtPct(k.vs_plan)} vs plan`, v: k.vs_plan },
      genieTitle: 'Total Sales',
      geniePrompt:
        `Total sales reached ${fmtMoney(k.total_sales)} (${fmtPct(k.vs_plan)} vs plan). ` +
        `Decompose the variance vs plan by category and store - show me the top 3 contributors ` +
        `and the top 3 detractors. For each detractor, recommend a specific corrective action.`,
    },
    {
      label: 'Comp Store Sales',
      value: fmtMoney(k.comp_sales),
      delta: { text: `${fmtPct(k.comp_yoy)} vs PY`, v: k.comp_yoy },
      genieTitle: 'Comp Store Sales',
      geniePrompt:
        `Comp store sales came in at ${fmtMoney(k.comp_sales)} (${fmtPct(k.comp_yoy)} vs PY). ` +
        `Decompose the comp growth by region and store - show me the 3 strongest comping stores ` +
        `and the 3 weakest. For each weak store, determine whether traffic, basket size, or ` +
        `in-stock availability is driving the gap and recommend a specific corrective action.`,
    },
    {
      label: 'E-Commerce Sales',
      value: fmtMoney(k.ecom_sales),
      delta: { text: `${fmtPct(k.ecom_yoy, 0)} vs PY`, v: k.ecom_yoy },
      genieTitle: 'E-Commerce Sales',
      geniePrompt:
        `E-commerce sales reached ${fmtMoney(k.ecom_sales)} (${fmtPct(k.ecom_yoy, 0)} vs PY). ` +
        `Decompose the online performance by category and by month - show me the top 3 growth ` +
        `drivers and the top 3 laggards. For each laggard, recommend a specific action on ` +
        `digital assortment, pricing, or fulfillment to accelerate it.`,
    },
    {
      label: 'Transaction Count',
      value: k.transactions.toLocaleString(),
      genieTitle: 'Transaction Count',
      geniePrompt:
        `Transaction count stands at ${k.transactions.toLocaleString()} this period. ` +
        `Decompose transactions by store and category - show me the top 3 volume drivers and ` +
        `the bottom 3 stores. For each low-volume store, compare customer traffic against ` +
        `conversion rate to isolate the cause, and recommend a specific action to lift transactions.`,
    },
    {
      label: 'In-Stock Rate',
      value: `${k.in_stock_rate}%`,
      genieTitle: 'In-Stock Rate',
      geniePrompt:
        `In-stock rate is ${k.in_stock_rate}% against a 95% retail benchmark. ` +
        `Decompose in-stock performance by store and category - show me the 3 best and 3 worst ` +
        `stores along with their nil picks and days of supply. For each of the worst stores, ` +
        `recommend a specific replenishment or allocation fix.`,
    },
    {
      label: 'Gross Margin',
      value: `${k.gross_margin}%`,
      genieTitle: 'Gross Margin',
      geniePrompt:
        `Gross margin is ${k.gross_margin}% this period. Decompose margin by category and ` +
        `subcategory - show me the top 3 margin contributors and the 3 biggest margin drags, ` +
        `including the effect of promo lift. For each drag, recommend a specific pricing, ` +
        `promotion, or mix action to recover margin.`,
    },
    {
      label: 'Customer Traffic',
      value: k.customer_traffic.toLocaleString(),
      delta: { text: `${fmtPct(k.traffic_yoy)} vs PY`, v: k.traffic_yoy },
      genieTitle: 'Customer Traffic',
      geniePrompt:
        `Customer traffic totaled ${k.customer_traffic.toLocaleString()} (${fmtPct(k.traffic_yoy)} vs PY). ` +
        `Decompose the year-over-year traffic variance by store and region - show me the 3 ` +
        `best-performing stores and the 3 steepest decliners. For each declining store, ` +
        `recommend a specific corrective action to recover footfall.`,
    },
    {
      label: 'On-Time Delivery',
      value: `${k.on_time_delivery}%`,
      genieTitle: 'On-Time Delivery',
      geniePrompt:
        `On-time delivery is running at ${k.on_time_delivery}%. Decompose delivery performance ` +
        `by region and store - show me the 3 most reliable stores and the 3 least reliable, and ` +
        `correlate the misses with nil picks and in-stock rate. For each weak store, recommend ` +
        `a specific supply-chain corrective action.`,
    },
  ]
}

export default function KpiGrid({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [kpis, setKpis] = useState<ExecKpis | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.execKpis()
      .then(d => { if (!cancelled) setKpis(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <Card className="px-5 py-8 text-center text-[13px] text-sub">
        Executive KPIs are unavailable right now.
      </Card>
    )
  }
  if (!kpis) return <Card><Spinner label="Loading executive KPIs..." /></Card>

  return (
    <div className="grid grid-cols-4 gap-4">
      {buildCards(kpis).map(c => (
        <Card key={c.label} className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="metric-label">{c.label}</span>
            <AskGenie onAsk={() => openGenie(c.genieTitle, c.geniePrompt)} />
          </div>
          <div className="mt-1 text-[22px] font-extrabold leading-tight text-ink">{c.value}</div>
          {c.delta && (
            <div className={`mt-0.5 text-[11px] font-medium ${deltaClass(c.delta.v)}`}>
              {c.delta.text}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
