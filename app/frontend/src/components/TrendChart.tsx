import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, fmtMoney, type TrendPoint } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const BRAND = '#e0312b'
const AXIS = '#6b675f'
const GRID = '#eee9df'
const Y_TICKS = [0, 650000, 1300000, 1900000, 2600000]

type TooltipEntry = { payload?: TrendPoint }

function TrendTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<TooltipEntry> }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-sm">
      <div className="font-mono text-[10px] text-sub">{point.month}</div>
      <div className="text-[11px] font-bold text-brand">Sales: {fmtMoney(point.sales)}</div>
    </div>
  )
}

export default function TrendChart({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  const [data, setData] = useState<TrendPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api.trend()
      .then(d => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  return (
    <Card>
      <SectionHeader
        title="Monthly Sales Trend"
        onAsk={() => openGenie(
          'Monthly Sales Trend',
          'Walk me through the 2025 monthly sales trend. What drove the dip in February 2025, how quickly did sales recover in March, and which months finished strongest?',
        )}
      />
      <div className="px-5 pb-5">
        {failed ? (
          <div className="flex h-64 items-center justify-center text-[12px] text-sub">Trend data unavailable</div>
        ) : !data ? (
          <Spinner label="Loading sales trend..." />
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-[12px] text-sub">No trend data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => m.slice(5)}
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke={AXIS}
                tickMargin={6}
              />
              <YAxis
                ticks={Y_TICKS}
                domain={[0, 2600000]}
                tickFormatter={fmtMoney}
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke={AXIS}
                width={52}
                tickMargin={4}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={BRAND}
                strokeWidth={2}
                fill="rgba(224,49,43,0.09)"
                dot={false}
                activeDot={{ r: 3, fill: BRAND, stroke: '#ffffff', strokeWidth: 1 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
