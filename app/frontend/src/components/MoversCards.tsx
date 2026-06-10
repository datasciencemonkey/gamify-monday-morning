import { useEffect, useState } from 'react'
import { api, fmtMoney, type Movers, type MoverRow } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

function MoverList({ rows, pctClass, fmtPctRow }: {
  rows: MoverRow[]
  pctClass: string
  fmtPctRow: (pct: number) => string
}) {
  return (
    <div className="divide-y divide-line/70 px-5 pb-3">
      {rows.slice(0, 5).map(r => (
        <a
          key={r.product_name}
          href={`#/demand/sku/${r.sku_id}`}
          className="-mx-2 flex items-start justify-between rounded px-2 py-2.5 cursor-pointer no-underline text-inherit hover:bg-cream/70"
        >
          <div className="min-w-0 pr-3">
            <div className="truncate text-[12px] font-semibold">{r.product_name}</div>
            <div className="text-[11px] text-sub">{r.category}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[12px] font-bold">{fmtMoney(r.sales)}</div>
            <div className={`text-[11px] ${pctClass}`}>{fmtPctRow(r.pct)}</div>
          </div>
        </a>
      ))}
    </div>
  )
}

export default function MoversCards({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [data, setData] = useState<Movers | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    api.movers()
      .then(d => { if (live) setData(d) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [])

  if (failed) {
    return (
      <Card>
        <p className="px-5 py-6 text-[12px] text-sub">Top movers, underperformers, and new items are unavailable right now.</p>
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

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <SectionHeader
          title="Top Movers"
          onAsk={() => openGenie(
            'Top Movers',
            'Which SKUs are the top movers this month, and what is driving their growth: promo lift, distribution gains, or organic demand? Quantify the contribution of each driver and tell me whether the momentum is sustainable.',
          )}
        />
        <MoverList rows={data.top_movers} pctClass="tone-good" fmtPctRow={p => `+${p}%`} />
      </Card>
      <Card>
        <SectionHeader
          title="Underperformers"
          onAsk={() => openGenie(
            'Underperformers',
            'Show the underperforming SKUs this month and diagnose the root causes: pricing, in-stock gaps, promo effectiveness, or shelf placement. Recommend one specific corrective action per SKU.',
          )}
        />
        <MoverList rows={data.underperformers} pctClass="tone-bad" fmtPctRow={p => `${p}%`} />
      </Card>
      <Card>
        <SectionHeader
          title="New Items"
          onAsk={() => openGenie(
            'New Items',
            'How are this month\'s new item launches performing versus their category benchmarks? Which new items should we scale with more distribution, and which need promo or placement support to hit their targets?',
          )}
        />
        <MoverList rows={data.new_items} pctClass="tone-good" fmtPctRow={p => `+${p}%`} />
      </Card>
    </div>
  )
}
