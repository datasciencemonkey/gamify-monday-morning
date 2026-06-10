import { useEffect, useState } from 'react'
import { api, type CategoryKpi } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const HEADERS = [
  'CATEGORY', 'GROWTH VS MARKET', 'TRIP CONV.', 'BASKET ATTACH', '$/LIN FT', 'PLANO COMP.', 'NEW ITEM SUCCESS',
] as const

export default function CategoryKpisTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [rows, setRows] = useState<CategoryKpi[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    api.categoryKpis()
      .then(d => { if (live) setRows(d) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [])

  const ask = () => openGenie(
    'Category Management KPIs',
    'Compare the category management KPIs across all five categories: growth vs market, trip conversion, basket attach, $ per linear foot, planogram compliance, and new item success rate. Which category is strongest overall, which is weakest, and what specific corrective action would you recommend for the weakest one?',
  )

  return (
    <Card>
      <SectionHeader title="Category Management KPIs" onAsk={ask} />
      {failed ? (
        <p className="px-5 pb-5 text-[12px] text-sub">Category KPIs are unavailable right now.</p>
      ) : !rows ? (
        <Spinner label="Loading category KPIs..." />
      ) : (
        <div className="px-5 pb-4">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-cream/60">
                {HEADERS.map((h, i) => (
                  <th key={h} className={`metric-label whitespace-nowrap px-2 py-2 ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const successPct = r.new_items_launched > 0
                  ? Math.round((r.new_items_successful / r.new_items_launched) * 100)
                  : 0
                return (
                  <tr key={r.category} className="border-t border-line">
                    <td className="px-2 py-2.5 font-medium">{r.category}</td>
                    <td className="px-2 py-2.5 text-right tone-good">+{r.growth_vs_market_pp}pp</td>
                    <td className="px-2 py-2.5 text-right">{r.trip_conversion_pct}%</td>
                    <td className="px-2 py-2.5 text-right">{r.basket_attach_pct}%</td>
                    <td className="px-2 py-2.5 text-right">${Math.round(r.dollars_per_linear_foot)}</td>
                    <td className="px-2 py-2.5 text-right">{r.planogram_compliance_pct}%</td>
                    <td className="px-2 py-2.5 text-right">{r.new_items_successful}/{r.new_items_launched} ({successPct}%)</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
