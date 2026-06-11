import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api, fmtMoney, fmtPct, type CategoryRow, type SkuRow } from '../lib/api'
import { Card, Spinner } from './ui'
import StoreComparison from './StoreComparison'

type Sel = { level: 'category' | 'subcategory'; name: string }
type Metrics = Pick<SkuRow,
  'sales' | 'units' | 'vs_plan' | 'vs_py' | 'margin' | 'in_stock' | 'dos' |
  'promo_lift' | 'trip_conv' | 'basket_att' | 'dpl' | 'new_pct'>

const HEADERS = ['NAME', 'UPC', 'SALES', 'UNITS', 'VS PLAN', 'VS PY', 'MARGIN', 'IN-STOCK',
  'DOS', 'PROMO LIFT', 'TRIP CONV', 'BASKET ATT.', '$/LIN FT', 'NEW ITEM %', '']

const num = 'px-2 py-2 text-right whitespace-nowrap'

function MetricCells({ m }: { m: Metrics }) {
  return (
    <>
      <td className={`${num} font-semibold`}>{fmtMoney(m.sales)}</td>
      <td className={num}>{m.units.toLocaleString()}</td>
      <td className={`${num} tone-bad`}>{fmtPct(m.vs_plan)}</td>
      <td className={`${num} tone-good`}>{fmtPct(m.vs_py)}</td>
      <td className={num}>{m.margin}%</td>
      <td className={`${num}${m.in_stock < 80.5 ? ' tone-bad' : ''}`}>{m.in_stock}%</td>
      <td className={num}>{m.dos.toFixed(1)}</td>
      <td className={num}>{m.promo_lift}%</td>
      <td className={num}>{m.trip_conv}%</td>
      <td className={num}>{m.basket_att}%</td>
      <td className={num}>${m.dpl}</td>
      <td className={num}>{m.new_pct}%</td>
    </>
  )
}

const toggled = (set: Set<string>, k: string) => {
  const n = new Set(set)
  if (n.has(k)) n.delete(k)
  else n.add(k)
  return n
}

export default function DrilldownTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie
  const [rows, setRows] = useState<CategoryRow[] | null>(null)
  const [err, setErr] = useState(false)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<Sel | null>(null)

  useEffect(() => {
    let live = true
    api.drilldown()
      .then(d => {
        if (!live) return
        setRows(d)
        if (d.length > 0) setSel({ level: 'category', name: d[0].category })
      })
      .catch(() => { if (live) setErr(true) })
    return () => { live = false }
  }, [])

  return (
    <div>
      <h2 className="text-[15px] font-bold mb-3">Category → Subcategory → SKU Drill-Down</h2>

      {err ? (
        <Card><div className="px-5 py-10 text-center text-[12px] text-sub">Drill-down data unavailable.</div></Card>
      ) : !rows ? (
        <Card><Spinner label="Loading drill-down..." /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-cream/60">
                {HEADERS.map((h, i) => (
                  <th
                    key={h === '' ? 'action' : h}
                    className={`metric-label py-2 ${i === 0 ? 'pl-3 pr-2 text-left' : i === HEADERS.length - 1 ? 'px-2 pr-3' : 'px-2 text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const catOpen = openCats.has(c.category)
                const catSel = sel?.level === 'category' && sel.name === c.category
                return (
                  <Fragment key={c.category}>
                    <tr
                      onClick={() => {
                        setOpenCats(t => toggled(t, c.category))
                        setSel({ level: 'category', name: c.category })
                      }}
                      className={`cursor-pointer select-none border-t border-line ${catSel ? 'bg-cream/80' : 'hover:bg-cream/40'}`}
                    >
                      <td className="pl-3 pr-2 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-bold">
                          {catOpen
                            ? <ChevronDown size={12} className="text-brand shrink-0" />
                            : <ChevronRight size={12} className="text-brand shrink-0" />}
                          {c.category}
                        </span>
                      </td>
                      <td className={`${num} text-sub`}>—</td>
                      <MetricCells m={c} />
                      <td className="px-2 pr-3 py-2" />
                    </tr>
                    {catOpen && c.subcategories.map(sub => {
                      const k = `${c.category}|${sub.subcategory}`
                      const subOpen = openSubs.has(k)
                      const subSel = sel?.level === 'subcategory' && sel.name === sub.subcategory
                      return (
                        <Fragment key={k}>
                          <tr
                            onClick={() => {
                              setOpenSubs(t => toggled(t, k))
                              setSel({ level: 'subcategory', name: sub.subcategory })
                            }}
                            className={`cursor-pointer select-none border-t border-line ${subSel ? 'bg-cream/80' : 'hover:bg-cream/40'}`}
                          >
                            <td className="pl-6 pr-2 py-2 whitespace-nowrap">
                              <span className="flex items-center gap-1 font-semibold">
                                {subOpen
                                  ? <ChevronDown size={12} className="text-genie shrink-0" />
                                  : <ChevronRight size={12} className="text-genie shrink-0" />}
                                {sub.subcategory}
                              </span>
                            </td>
                            <td className={`${num} text-sub`}>—</td>
                            <MetricCells m={sub} />
                            <td className="px-2 pr-3 py-2" />
                          </tr>
                          {subOpen && sub.skus.map(s => (
                            <tr key={s.sku_id} className="border-t border-line hover:bg-cream/30">
                              <td className="pl-12 pr-2 py-2 whitespace-nowrap">{s.product_name}</td>
                              <td className={`${num} font-mono text-[10.5px] text-sub`}>{s.upc}</td>
                              <MetricCells m={s} />
                              <td className="px-2 pr-3 py-2 text-right">
                                <a
                                  href={`#/demand/sku/${s.sku_id}`}
                                  onClick={e => e.stopPropagation()}
                                  className="inline-block whitespace-nowrap rounded border border-brand/50 px-1.5 py-0.5 text-[10px] text-brand hover:bg-brand/5"
                                >
                                  Demand →
                                </a>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {sel && (
        <div className="mt-5">
          <StoreComparison level={sel.level} name={sel.name} key={sel.level + sel.name} />
        </div>
      )}
    </div>
  )
}
