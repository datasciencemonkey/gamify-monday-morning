import { useEffect, useState } from 'react'
import { api, type CategoryKpi } from '../lib/api'
import { Card, SectionHeader, Spinner, deltaClass } from './ui'

// "53" not "53.0", "63.7" stays "63.7"
const n1 = (v: number) => (Math.round(v * 10) / 10).toString()

const GENIE_PROMPT =
  'Review the Category Management KPIs across all categories: growth vs market, trip conversion, ' +
  'basket attach rate, sales per linear foot, planogram compliance, and new item success rate. ' +
  'Which category is best-in-class, which one most needs intervention, and what specific ' +
  'merchandising action would you recommend for each laggard?'

export default function CategoryKpisTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [rows, setRows] = useState<CategoryKpi[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.categoryKpis().then(setRows).catch(() => setError(true))
  }, [])

  return (
    <Card>
      <SectionHeader
        title="Category Management KPIs"
        onAsk={() => openGenie('Category Management KPIs', GENIE_PROMPT)}
      />
      {error ? (
        <div className="px-5 pb-6 pt-2 text-center text-[12px] text-sub">
          Category KPIs are unavailable right now.
        </div>
      ) : !rows ? (
        <Spinner label="Loading category KPIs..." />
      ) : (
        <div className="px-3 pb-4">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-cream/60">
                <th className="metric-label px-2 py-2 text-left">Category</th>
                <th className="metric-label px-2 py-2 text-right">Growth vs Market</th>
                <th className="metric-label px-2 py-2 text-right">Trip Conv.</th>
                <th className="metric-label px-2 py-2 text-right">Basket Attach</th>
                <th className="metric-label px-2 py-2 text-right">$/Lin Ft</th>
                <th className="metric-label px-2 py-2 text-right">Plano Comp.</th>
                <th className="metric-label px-2 py-2 text-right">New Item Success</th>
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
                    <td className={`px-2 py-2.5 text-right tabular-nums ${deltaClass(r.growth_vs_market_pp)}`}>
                      {r.growth_vs_market_pp > 0 ? '+' : ''}{n1(r.growth_vs_market_pp)}pp
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{n1(r.trip_conversion_pct)}%</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{n1(r.basket_attach_pct)}%</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{`$${Math.round(r.dollars_per_linear_foot)}`}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{n1(r.planogram_compliance_pct)}%</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {r.new_items_successful}/{r.new_items_launched} ({successPct}%)
                    </td>
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
