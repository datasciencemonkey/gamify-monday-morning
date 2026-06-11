import { useEffect, useState } from 'react'
import { api, fmtMoney, type MoverRow, type Movers } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

// "40" not "40.0", "1478.9" stays "1478.9"
const n1 = (v: number) => (Math.round(v * 10) / 10).toString()

type Panel = {
  title: string
  rows: MoverRow[]
  pct: (v: number) => string
  tone: 'tone-good' | 'tone-bad'
  prompt: string
}

function MoverPanel({ panel, openGenie }: { panel: Panel; openGenie: (title: string, prompt: string) => void }) {
  return (
    <Card>
      <SectionHeader title={panel.title} onAsk={() => openGenie(panel.title, panel.prompt)} />
      <div className="px-5 pb-3">
        <div className="divide-y divide-line/70">
          {panel.rows.slice(0, 5).map(r => (
            <div
              key={r.sku_id}
              className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-2.5 hover:bg-cream/70"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold">{r.product_name}</div>
                <div className="truncate text-[11px] text-sub">{r.category}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[12px] font-bold tabular-nums">{fmtMoney(r.sales)}</div>
                <div className={`text-[11px] tabular-nums ${panel.tone}`}>{panel.pct(r.pct)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function MoversCards({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [data, setData] = useState<Movers | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.movers().then(setData).catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <Card>
        <div className="px-5 py-8 text-center text-[12px] text-sub">Movers data is unavailable right now.</div>
      </Card>
    )
  }
  if (!data) {
    return (
      <Card>
        <Spinner label="Loading movers..." />
      </Card>
    )
  }

  const panels: Panel[] = [
    {
      title: 'Top Movers',
      rows: data.top_movers,
      pct: v => `+${n1(v)}%`,
      tone: 'tone-good',
      prompt:
        'These are the five fastest-growing SKUs this month. What is driving each gain - promo lift, ' +
        'distribution expansion, or seasonality - and which increases look sustainable versus one-time spikes?',
    },
    {
      title: 'Underperformers',
      rows: data.underperformers,
      pct: v => `${n1(v)}%`,
      tone: 'tone-bad',
      prompt:
        'These five SKUs are the biggest underperformers this month. Diagnose the likely root cause for each ' +
        '(pricing, promo gaps, out-of-stocks, or competitive pressure) and recommend one corrective action per SKU.',
    },
    {
      title: 'New Items',
      rows: data.new_items,
      pct: v => `+${n1(v)}%`,
      tone: 'tone-good',
      prompt:
        'Review the five strongest new item launches this month. Which are pacing toward the success threshold, ' +
        'and which need incremental merchandising or promo support to stay on track?',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {panels.map(p => (
        <MoverPanel key={p.title} panel={p} openGenie={openGenie} />
      ))}
    </div>
  )
}
