import { useEffect, useState } from 'react'
import { api, type Secondary } from '../lib/api'
import { AskGenie, Card, Spinner } from './ui'

// "2" not "2.0", "92.7" stays "92.7"
const n1 = (v: number) => (Math.round(v * 10) / 10).toString()

export default function SecondaryKpis({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [data, setData] = useState<Secondary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.secondary().then(setData).catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <Card>
        <div className="px-5 py-8 text-center text-[12px] text-sub">Secondary KPIs are unavailable right now.</div>
      </Card>
    )
  }
  if (!data) {
    return (
      <Card>
        <Spinner label="Loading secondary KPIs..." />
      </Card>
    )
  }

  const cards = [
    {
      label: 'Avg Basket Size',
      value: `$${data.avg_basket.toFixed(2)}`,
      sub: `${n1(data.avg_items)} avg items per transaction`,
      prompt:
        `Average basket size is $${data.avg_basket.toFixed(2)} with ${n1(data.avg_items)} items per ` +
        'transaction on average. Which categories have the strongest attach opportunities, and what ' +
        'cross-merchandising moves would lift basket size?',
    },
    {
      label: 'Conversion Rate',
      value: `${n1(data.conversion_rate)}%`,
      sub: `NPS Score: ${Math.round(data.nps)}`,
      prompt:
        `Conversion rate is ${n1(data.conversion_rate)}% with an NPS score of ${Math.round(data.nps)}. ` +
        'Break conversion down by store and category - where are we losing trips, and what would move ' +
        'conversion up a full point?',
    },
    {
      label: 'Private Label',
      value: `${n1(data.private_label_pct)}%`,
      sub: 'of total sales',
      prompt:
        `Private label represents ${n1(data.private_label_pct)}% of total sales. How does private label ` +
        'penetration vary by category, and where is the biggest headroom to grow it profitably?',
    },
    {
      label: 'Case Fill Rate',
      value: `${n1(data.case_fill_rate)}%`,
      sub: `OTIF: ${n1(data.otif)}%`,
      prompt:
        `Case fill rate is ${n1(data.case_fill_rate)}% and OTIF is ${n1(data.otif)}%. Which suppliers or ` +
        'distribution centers are dragging fill rates, and what is the sales risk if this persists?',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label} className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="metric-label">{c.label}</span>
            <AskGenie onAsk={() => openGenie(c.label, c.prompt)} />
          </div>
          <div className="mt-1.5 text-[20px] font-extrabold tracking-tight tabular-nums">{c.value}</div>
          <div className="mt-0.5 text-[11px] text-sub">{c.sub}</div>
        </Card>
      ))}
    </div>
  )
}
