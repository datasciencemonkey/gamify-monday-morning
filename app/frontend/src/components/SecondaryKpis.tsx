import { useEffect, useState } from 'react'
import { api, type Secondary } from '../lib/api'
import { AskGenie, Card, Spinner } from './ui'

export default function SecondaryKpis({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [d, setD] = useState<Secondary | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    api.secondary()
      .then(res => { if (live) setD(res) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [])

  if (failed) {
    return (
      <Card>
        <p className="px-5 py-6 text-[12px] text-sub">Secondary KPIs are unavailable right now.</p>
      </Card>
    )
  }
  if (!d) {
    return (
      <Card>
        <Spinner label="Loading secondary KPIs..." />
      </Card>
    )
  }

  const cards = [
    {
      label: 'AVG BASKET SIZE',
      value: `$${d.avg_basket}`,
      sub: `${d.avg_items} avg items per transaction`,
      title: 'Avg Basket Size',
      prompt: `Average basket size is $${d.avg_basket} with ${d.avg_items} avg items per transaction. Which categories and cross-sell attach opportunities would lift basket size the most, and what merchandising moves would you recommend?`,
    },
    {
      label: 'CONVERSION RATE',
      value: `${d.conversion_rate}%`,
      sub: `NPS Score: ${d.nps}`,
      title: 'Conversion Rate',
      prompt: `Conversion rate is ${d.conversion_rate}% with an NPS score of ${d.nps}. Where in the shopper funnel are we losing conversions, which stores convert best and worst, and how does NPS correlate with conversion?`,
    },
    {
      label: 'PRIVATE LABEL',
      value: `${d.private_label_pct}%`,
      sub: 'of total sales',
      title: 'Private Label',
      prompt: `Private label represents ${d.private_label_pct}% of total sales. How does private label penetration vary by category, where is the biggest headroom to grow it, and what is the margin impact of shifting share to private label?`,
    },
    {
      label: 'CASE FILL RATE',
      value: `${d.case_fill_rate}%`,
      sub: `OTIF: ${d.otif}%`,
      title: 'Case Fill Rate',
      prompt: `Case fill rate is ${d.case_fill_rate}% and OTIF is ${d.otif}%. Which suppliers or distribution centers are driving the fill-rate misses, and what is the downstream impact on store in-stock rates?`,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label} className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="metric-label">{c.label}</span>
            <AskGenie onAsk={() => openGenie(c.title, c.prompt)} />
          </div>
          <div className="mt-1.5 text-[20px] font-extrabold">{c.value}</div>
          <div className="mt-0.5 text-[11px] text-sub">{c.sub}</div>
        </Card>
      ))}
    </div>
  )
}
