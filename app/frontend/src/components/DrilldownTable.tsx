import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api, fmtMoney, fmtPct } from '../lib/api'
import type { CategoryRow, SkuRow, SubcatRow } from '../lib/api'
import { Card, Spinner } from './ui'
import StoreComparison from './StoreComparison'

type Level = 'category' | 'subcategory'
type Sel = { level: Level; name: string }
type Metrics = Pick<SkuRow,
  'sales' | 'units' | 'vs_plan' | 'vs_py' | 'margin' | 'in_stock' | 'dos' |
  'promo_lift' | 'trip_conv' | 'basket_att' | 'dpl' | 'new_pct'>

const NUM = 'px-2.5 py-2 text-right whitespace-nowrap'

const HEAD: { label: string; align: string }[] = [
  { label: 'Name', align: 'text-left' },
  { label: 'UPC', align: 'text-right' },
  { label: 'Sales', align: 'text-right' },
  { label: 'Units', align: 'text-right' },
  { label: 'VS Plan', align: 'text-right' },
  { label: 'VS PY', align: 'text-right' },
  { label: 'Margin', align: 'text-right' },
  { label: 'In-Stock', align: 'text-right' },
  { label: 'DOS', align: 'text-right' },
  { label: 'Promo Lift', align: 'text-right' },
  { label: 'Trip Conv', align: 'text-right' },
  { label: 'Basket Att.', align: 'text-right' },
  { label: '$/Lin Ft', align: 'text-right' },
  { label: 'New Item %', align: 'text-right' },
]

function MetricCells({ m }: { m: Metrics }) {
  return (
    <>
      <td className={`${NUM} font-semibold`}>{fmtMoney(m.sales)}</td>
      <td className={NUM}>{m.units.toLocaleString()}</td>
      <td className={`${NUM} tone-bad font-medium`}>{fmtPct(m.vs_plan)}</td>
      <td className={`${NUM} tone-good font-medium`}>{fmtPct(m.vs_py)}</td>
      <td className={NUM}>{m.margin}%</td>
      <td className={`${NUM}${m.in_stock < 80.5 ? ' tone-bad font-medium' : ''}`}>{m.in_stock}%</td>
      <td className={NUM}>{m.dos.toFixed(1)}</td>
      <td className={NUM}>{m.promo_lift}%</td>
      <td className={NUM}>{m.trip_conv}%</td>
      <td className={NUM}>{m.basket_att}%</td>
      <td className={NUM}>${m.dpl}</td>
      <td className={NUM}>{m.new_pct}%</td>
    </>
  )
}

const rowCls = (selected: boolean) =>
  `cursor-pointer border-t border-line transition-colors ${selected ? 'bg-cream/80' : 'hover:bg-cream/40'}`

export default function DrilldownTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie // part of the mount contract in App.tsx; drill-down has no Ask Genie affordance
  const [rows, setRows] = useState<CategoryRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<Sel | null>(null)

  useEffect(() => {
    let alive = true
    api.drilldown()
      .then(d => {
        if (!alive) return
        setRows(d)
        if (d.length > 0) {
          setSel({ level: 'category', name: d[0].category })
          setOpenCats(new Set([d[0].category]))
        }
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }
  const clickCat = (c: CategoryRow) => {
    setOpenCats(prev => toggle(prev, c.category))
    setSel({ level: 'category', name: c.category })
  }
  const clickSub = (c: CategoryRow, s: SubcatRow) => {
    setOpenSubs(prev => toggle(prev, `${c.category}|${s.subcategory}`))
    setSel({ level: 'subcategory', name: s.subcategory })
  }
  const isSel = (level: Level, name: string) => sel !== null && sel.level === level && sel.name === name

  return (
    <div>
      <h2 className="mb-3 text-[15px] font-bold text-ink">Category → Subcategory → SKU Drill-Down</h2>

      {failed ? (
        <Card>
          <div className="px-5 py-10 text-center text-[12px] text-sub">
            Drill-down data is unavailable right now.
          </div>
        </Card>
      ) : !rows ? (
        <Card><Spinner label="Loading drill-down..." /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <div className="px-5 py-10 text-center text-[12px] text-sub">
            No drill-down data for this period.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-cream/60">
                  {HEAD.map(h => (
                    <th key={h.label} className={`metric-label whitespace-nowrap px-2.5 py-2 ${h.align}`}>
                      {h.label}
                    </th>
                  ))}
                  <th className="px-2.5 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map(c => {
                  const catOpen = openCats.has(c.category)
                  return (
                    <Fragment key={c.category}>
                      <tr onClick={() => clickCat(c)} className={rowCls(isSel('category', c.category))}>
                        <td className="px-2.5 py-2">
                          <span className="flex items-center gap-1">
                            {catOpen
                              ? <ChevronDown size={13} className="shrink-0 text-brand" />
                              : <ChevronRight size={13} className="shrink-0 text-brand" />}
                            <span className="font-bold">{c.category}</span>
                          </span>
                        </td>
                        <td className={`${NUM} text-sub`}>—</td>
                        <MetricCells m={c} />
                        <td className="px-2.5 py-2" />
                      </tr>
                      {catOpen && c.subcategories.map(s => {
                        const subKey = `${c.category}|${s.subcategory}`
                        const subOpen = openSubs.has(subKey)
                        return (
                          <Fragment key={subKey}>
                            <tr onClick={() => clickSub(c, s)} className={rowCls(isSel('subcategory', s.subcategory))}>
                              <td className="px-2.5 py-2">
                                <span className="flex items-center gap-1 pl-6">
                                  {subOpen
                                    ? <ChevronDown size={13} className="shrink-0 text-genie" />
                                    : <ChevronRight size={13} className="shrink-0 text-genie" />}
                                  <span className="font-semibold">{s.subcategory}</span>
                                </span>
                              </td>
                              <td className={`${NUM} text-sub`}>—</td>
                              <MetricCells m={s} />
                              <td className="px-2.5 py-2" />
                            </tr>
                            {subOpen && s.skus.map(k => (
                              <tr key={k.sku_id} className="border-t border-line">
                                <td className="px-2.5 py-2">
                                  <span className="block pl-12">{k.product_name}</span>
                                </td>
                                <td className={`${NUM} font-mono text-[10.5px] text-sub`}>{k.upc}</td>
                                <MetricCells m={k} />
                                <td className="px-2.5 py-2 text-right">
                                  <a
                                    href={`#/demand/sku/${k.sku_id}`}
                                    className="inline-block whitespace-nowrap rounded border border-brand/50 px-1.5 py-0.5 text-[10px] font-medium text-brand hover:bg-brand/5"
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
          </div>
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
