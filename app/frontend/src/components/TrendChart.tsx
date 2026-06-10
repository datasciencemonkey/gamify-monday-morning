import { useEffect, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, fmtMoney, type TrendPoint } from '../lib/api'
import { Card, SectionHeader, Spinner } from './ui'

const Y_TICKS = [0, 650000, 1300000, 1900000, 2600000]
const Y_DOMAIN: [number, number] = [0, 2600000]

function TrendTip({ active, payload }: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: TrendPoint }>
}) {
  const point = active && payload && payload.length > 0 ? payload[0]?.payload : undefined
  if (!point) return null
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-md">
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

  const onAsk = () => {
    const dip = data && data.length > 0
      ? data.reduce((lo, p) => (p.sales < lo.sales ? p : lo))
      : null
    openGenie(
      'Monthly Sales Trend',
      dip
        ? `The 2025 monthly sales trend dips to ${fmtMoney(dip.sales)} in ${dip.month} before recovering. What drove that dip — decompose the month-over-month change by category and store, and tell me whether the recovery is broad-based or concentrated in a few categories.`
        : 'Walk me through the 2025 monthly sales trend: which months dipped, what drove the dip, and how broad-based was the recovery?',
    )
  }

  return (
    <Card>
      <SectionHeader title="Monthly Sales Trend" onAsk={onAsk} />
      {failed ? (
        <div className="px-5 pb-6 text-[12px] text-sub">Trend data is unavailable right now.</div>
      ) : !data ? (
        <Spinner label="Loading sales trend…" />
      ) : data.length === 0 ? (
        <div className="px-5 pb-6 text-[12px] text-sub">No trend data for this period.</div>
      ) : (
        <div className="px-3 pb-4">
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eee9df" />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => m.slice(5)}
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke="#6b675f"
                interval={0}
                tickMargin={6}
              />
              <YAxis
                ticks={Y_TICKS}
                domain={Y_DOMAIN}
                tickFormatter={fmtMoney}
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke="#6b675f"
                width={52}
              />
              <Tooltip content={<TrendTip />} cursor={{ stroke: '#d8d2c6', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#e0312b"
                strokeWidth={2}
                fill="rgba(224,49,43,0.09)"
                dot={false}
                activeDot={{ r: 3.5, fill: '#e0312b', strokeWidth: 0 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
