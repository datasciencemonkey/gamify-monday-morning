// DASH-10 - Inventory Health by Store: 15 stores sorted ascending by in-stock %.
import { useEffect, useState } from 'react'
import { api, type InventoryRow } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const GENIE_PROMPT =
  'Several stores are running below our 80% in-stock target. Rank stores by out-of-stock risk using ' +
  'in-stock %, nil picks, and days of supply; call out the regions where risk is concentrated; and ' +
  'recommend specific replenishment actions for the five most at-risk stores.'

// Values arrive in percent points (e.g. 76.2). Match the reference: "78%" not "78.0%".
const fmtStock = (v: number) => `${v.toFixed(1).replace(/\.0$/, '')}%`
const stockClass = (v: number) => (v < 80 ? 'tone-bad' : v < 82 ? 'text-warn' : 'text-ink')
const supplyClass = (v: number) => (v <= 4.9 ? 'tone-bad' : 'text-ink')

export default function InventoryTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [rows, setRows] = useState<InventoryRow[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    api.inventory()
      .then(d => { if (live) setRows(d) })
      .catch(() => { if (live) setError(true) })
    return () => { live = false }
  }, [])

  return (
    <Card>
      <SectionHeader
        title="Inventory Health by Store"
        onAsk={() => openGenie('Inventory Health', GENIE_PROMPT)}
      />
      {error ? (
        <div className="px-5 pb-5 text-[12px] text-sub">Inventory data is unavailable right now.</div>
      ) : !rows ? (
        <Spinner label="Loading inventory health..." />
      ) : rows.length === 0 ? (
        <div className="px-5 pb-5 text-[12px] text-sub">No inventory data for this period.</div>
      ) : (
        <div className="px-5 pb-4">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-cream/60">
                <th className="metric-label rounded-l-md px-3 py-2 text-left">Store</th>
                <th className="metric-label px-3 py-2 text-left">Region</th>
                <th className="metric-label px-3 py-2 text-right">In-Stock %</th>
                <th className="metric-label px-3 py-2 text-right">Nil Picks</th>
                <th className="metric-label rounded-r-md px-3 py-2 text-right">Days Supply</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.store_name} className="border-t border-line">
                  <td className="px-3 py-2.5 font-medium text-ink">{r.store_name}</td>
                  <td className="px-3 py-2.5 text-sub">{r.region}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${stockClass(r.in_stock_pct)}`}>
                    {fmtStock(r.in_stock_pct)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.nil_picks.toLocaleString()}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${supplyClass(r.days_supply)}`}>
                    {r.days_supply.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
