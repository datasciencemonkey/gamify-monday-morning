import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { api, fmtMoney, type CategorySales } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const SEGMENT_COLORS: Record<string, string> = {
  'Food Storage': '#e0312b',
  'Pest Control': '#8f1d16',
  'Air Care': '#e8a13d',
  'Home Cleaning': '#169a53',
  'Shoe Care': '#2f6fed',
}
const FALLBACK_COLOR = '#6b675f'

const colorFor = (category: unknown): string =>
  typeof category === 'string' && SEGMENT_COLORS[category] ? SEGMENT_COLORS[category] : FALLBACK_COLOR

type DonutLabelProps = {
  x?: number | string
  y?: number | string
  textAnchor?: string
  name?: string | number
  value?: number
}

function renderLabel(props: DonutLabelProps): ReactElement {
  const { x = 0, y = 0, textAnchor, name, value } = props
  const anchor: 'start' | 'middle' | 'end' | 'inherit' =
    textAnchor === 'start' || textAnchor === 'end' || textAnchor === 'inherit' ? textAnchor : 'middle'
  const text = [
    typeof name === 'string' ? name : '',
    typeof value === 'number' ? fmtMoney(value) : '',
  ].filter(Boolean).join(' ')
  return (
    <text x={x} y={y} textAnchor={anchor} fill={colorFor(name)} fontSize={10} fontWeight={500} dominantBaseline="central">
      {text}
    </text>
  )
}

export default function CategoryDonut({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [data, setData] = useState<CategorySales[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api.categorySales()
      .then(d => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  return (
    <Card>
      <SectionHeader
        title="Sales by Category"
        onAsk={() => openGenie(
          'Sales by Category',
          'Break down the current sales mix across the five categories. Why is Food Storage declining month over month while the other categories are growing, and what would it take to stabilize it?',
        )}
      />
      <div className="px-5 pb-5">
        {failed ? (
          <div className="flex h-64 items-center justify-center text-[12px] text-sub">Category data unavailable</div>
        ) : !data ? (
          <Spinner label="Loading category mix..." />
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-[12px] text-sub">No category data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <PieChart margin={{ top: 6, right: 10, bottom: 6, left: 10 }}>
              <Pie
                data={data}
                dataKey="sales"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={96}
                paddingAngle={1}
                stroke="#ffffff"
                strokeWidth={1}
                label={renderLabel}
                isAnimationActive
              >
                {data.map(d => (
                  <Cell key={d.category} fill={colorFor(d.category)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
