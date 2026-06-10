import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { api, fmtMoney, type CategorySales } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const COLORS: Record<string, string> = {
  'Food Storage': '#e0312b',
  'Pest Control': '#8f1d16',
  'Air Care': '#e8a13d',
  'Home Cleaning': '#169a53',
  'Shoe Care': '#2f6fed',
}
const FALLBACK_COLOR = '#6b675f'
const RADIAN = Math.PI / 180

type LabelGeom = {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  index?: number
}

export default function CategoryDonut({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [rows, setRows] = useState<CategorySales[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api.categorySales()
      .then(d => { if (alive) setRows(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const onAsk = () => {
    const mix = rows && rows.length > 0
      ? rows.map(r => `${r.category} ${fmtMoney(r.sales)}`).join(' · ')
      : null
    openGenie(
      'Sales by Category',
      mix
        ? `Current-month sales mix across categories: ${mix}. Food Storage is the only category declining month-over-month — quantify the decline, identify the subcategories and SKUs driving it, and recommend specific corrective actions to protect the category.`
        : 'Break down the current-month sales mix by category, quantify the Food Storage month-over-month decline, and recommend corrective actions.',
    )
  }

  const renderLabel = (props: unknown): ReactNode => {
    const { cx, cy, midAngle, outerRadius, index } = props as LabelGeom
    if (cx == null || cy == null || midAngle == null || outerRadius == null || index == null || !rows) return null
    const row = rows[index]
    if (!row) return null
    const color = COLORS[row.category] ?? FALLBACK_COLOR
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)
    const sx = cx + (outerRadius + 2) * cos
    const sy = cy + (outerRadius + 2) * sin
    const mx = cx + (outerRadius + 14) * cos
    const my = cy + (outerRadius + 14) * sin
    const ex = mx + (cos >= 0 ? 1 : -1) * 11
    const anchor = cos >= 0 ? 'start' : 'end'
    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${my}`} stroke={color} strokeWidth={1} fill="none" opacity={0.6} />
        <text x={ex + (cos >= 0 ? 4 : -4)} y={my} dy={3} textAnchor={anchor} fontSize={10} fontWeight={500} fill={color}>
          {row.category} {fmtMoney(row.sales)}
        </text>
      </g>
    )
  }

  return (
    <Card>
      <SectionHeader title="Sales by Category" onAsk={onAsk} />
      {failed ? (
        <div className="px-5 pb-6 text-[12px] text-sub">Category sales data is unavailable right now.</div>
      ) : !rows ? (
        <Spinner label="Loading category sales…" />
      ) : rows.length === 0 ? (
        <div className="px-5 pb-6 text-[12px] text-sub">No category sales for this period.</div>
      ) : (
        <div className="px-3 pb-4">
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="sales"
                nameKey="category"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={1}
                startAngle={90}
                endAngle={-270}
                labelLine={false}
                label={renderLabel}
                isAnimationActive
              >
                {rows.map(r => (
                  <Cell key={r.category} fill={COLORS[r.category] ?? FALLBACK_COLOR} stroke="#ffffff" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
