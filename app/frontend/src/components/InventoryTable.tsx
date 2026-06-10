import { useEffect, useState } from 'react'
import { api, type InventoryRow } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const HEADERS: { label: string; numeric: boolean }[] = [
  { label: 'STORE', numeric: false },
  { label: 'REGION', numeric: false },
  { label: 'IN-STOCK %', numeric: true },
  { label: 'NIL PICKS', numeric: true },
  { label: 'DAYS SUPPLY', numeric: true },
]

// 76.2 -> "76.2", 78 -> "78" (trailing .0 trimmed, matching the reference)
const fmt1 = (v: number) => `${Math.round(v * 10) / 10}`

const stockClass = (pct: number) =>
  pct < 80 ? 'tone-bad' : pct < 82 ? 'text-warn' : 'text-ink'

export default function InventoryTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [rows, setRows] = useState<InventoryRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api.inventory()
      .then(d => { if (alive) setRows(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const ask = () =>
    openGenie(
      'Inventory Health by Store',
      'Which stores carry the most in-stock risk right now? Rank all stores by in-stock %, flag those below 80% in-stock or with days of supply at 4.9 or less, relate nil picks to the shortfalls, call out any regional patterns, and recommend the top 3 replenishment actions.'
    )

  return (
    <Card>
      <SectionHeader title="Inventory Health by Store" onAsk={ask} />
      {failed ? (
        <div className="px-5 pb-6 text-[12px] text-sub">Inventory data is unavailable right now.</div>
      ) : !rows ? (
        <Spinner label="Loading inventory health…" />
      ) : (
        <div className="px-5 pb-5">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-cream/60">
                {HEADERS.map(h => (
                  <th key={h.label} className={`metric-label px-3 py-2 ${h.numeric ? 'text-right' : 'text-left'}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.store_name} className="border-t border-line">
                  <td className="px-3 py-2.5 font-medium text-ink">{r.store_name}</td>
                  <td className="px-3 py-2.5 text-sub">{r.region}</td>
                  <td className={`px-3 py-2.5 text-right ${stockClass(r.in_stock_pct)}`}>{fmt1(r.in_stock_pct)}%</td>
                  <td className="px-3 py-2.5 text-right text-ink">{r.nil_picks.toLocaleString()}</td>
                  <td className={`px-3 py-2.5 text-right ${r.days_supply <= 4.9 ? 'tone-bad' : 'text-ink'}`}>
                    {fmt1(r.days_supply)}
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
