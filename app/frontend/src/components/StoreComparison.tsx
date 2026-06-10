import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { api, fmtMoney } from '../lib/api'
import type { StoreComp } from '../lib/api'
import { AskGenie, Card, Spinner } from './ui'

// leaflet ships no bundled .d.ts (and @types/leaflet is not installed), so the
// react-leaflet props inherited from leaflet's option types (center, zoom,
// attribution, radius, ...) are invisible to tsc. Re-type the three affected
// components with the exact prop shapes used below.
type LeafletMapProps = {
  center: [number, number]; zoom: number; scrollWheelZoom: boolean
  className?: string; children?: ReactNode
}
type LeafletTileProps = { url: string; attribution: string }
type LeafletCircleProps = {
  center: [number, number]; radius: number
  pathOptions: { color: string; fillColor: string; fillOpacity: number; weight: number }
  children?: ReactNode
}
const LMapContainer = MapContainer as unknown as ComponentType<LeafletMapProps>
const LTileLayer = TileLayer as unknown as ComponentType<LeafletTileProps>
const LCircleMarker = CircleMarker as unknown as ComponentType<LeafletCircleProps>

const bandColor = (inStock: number | null) =>
  inStock !== null && inStock >= 90 ? '#169a53'
    : inStock !== null && inStock >= 80 ? '#e8a13d'
    : '#e0312b'

// Round up to a "nice" axis maximum (1/2/2.5/5 × 10^n).
const niceCeil = (v: number) => {
  const pow = 10 ** Math.floor(Math.log10(v))
  const unit = v / pow
  const mult = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10
  return mult * pow
}
const fmtTick = (v: number) => (v >= 1000 ? `$${+(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`)

export default function StoreComparison({ level, name, openGenie }: {
  level: 'category' | 'subcategory'
  name: string
  openGenie: (title: string, prompt: string) => void
}) {
  const [data, setData] = useState<StoreComp | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
    setFailed(false)
    api.storeComparison(level, name)
      .then(d => { if (alive) setData(d) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [level, name])

  if (failed) {
    return (
      <Card>
        <div className="px-5 py-10 text-center text-[12px] text-sub">
          Store comparison is unavailable right now.
        </div>
      </Card>
    )
  }
  if (!data) return <Card><Spinner label="Loading store comparison..." /></Card>

  const stores = data.stores
  const maxSales = Math.max(1, ...stores.map(s => s.sales))
  const axisMax = niceCeil(maxSales)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * axisMax)

  const askDispersion = () => {
    const top = data.top_store
    const lead = top
      ? `${top.store_name} leads at $${Math.round(top.sales).toLocaleString('en-US')} (${top.share}% of total)`
      : 'sales are spread across all 15 stores'
    openGenie(
      `Store Comparison: ${name}`,
      `For the ${level} "${name}", ${lead}. Explain the dispersion in store-level sales across the 15 stores and recommend specific actions to lift the bottom stores.`,
    )
  }

  return (
    <Card>
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <MapPin size={14} className="shrink-0 text-brand" />
            <span>Store comparison — {name}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-sub">
            {level === 'category' ? 'Category' : 'Subcategory'} · current month sales across all 15 stores
          </p>
        </div>
        <div className="flex items-start gap-4">
          {data.top_store && (
            <div className="text-right">
              <div className="metric-label">Top store</div>
              <div className="text-[12px] font-bold text-ink">{data.top_store.store_name}</div>
              <div className="text-[11px] text-sub">
                {fmtMoney(data.top_store.sales)} · {data.top_store.share}% of total
              </div>
            </div>
          )}
          <AskGenie onAsk={askDispersion} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 px-5 pb-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="metric-label">Geographic Distribution (NY/NJ/CT)</span>
            <span className="flex items-center gap-2.5 whitespace-nowrap text-[10px] text-sub">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-good" /> ≥90% stock
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warn" /> 80–90%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-bad" /> &lt;80%
              </span>
            </span>
          </div>
          <LMapContainer center={[40.83, -73.95]} zoom={9} scrollWheelZoom={false} className="h-72 w-full">
            <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM contributors" />
            {stores.map(s => {
              const c = bandColor(s.in_stock)
              return (
                <LCircleMarker
                  key={s.store_name}
                  center={[s.latitude, s.longitude]}
                  radius={6 + 14 * Math.sqrt(s.sales / maxSales)}
                  pathOptions={{ color: c, fillColor: c, fillOpacity: 0.75, weight: 1 }}
                >
                  <Tooltip>{s.store_name}</Tooltip>
                  <Popup>
                    <div className="text-[11px] leading-4">
                      <div className="font-bold">{s.store_name}</div>
                      <div className="text-sub">{s.city}, {s.state}</div>
                      <div className="mt-1">Sales: <b>{fmtMoney(s.sales)}</b></div>
                      <div>Units: <b>{s.units.toLocaleString()}</b></div>
                      <div>In-stock: <b>{s.in_stock !== null ? `${s.in_stock}%` : '—'}</b></div>
                      <div>On-hand: <b>{s.on_hand !== null ? s.on_hand.toLocaleString() : '—'}</b></div>
                    </div>
                  </Popup>
                </LCircleMarker>
              )
            })}
          </LMapContainer>
        </div>

        <div>
          <div className="mb-2">
            <span className="metric-label">Sales by Store (Sorted)</span>
          </div>
          <div className="relative pt-1">
            {/* subtle vertical gridlines behind the bars (bar area starts after w-32 label + gap-2) */}
            <div className="pointer-events-none absolute inset-y-0 left-[8.5rem] right-0">
              {[25, 50, 75].map(p => (
                <span key={p} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${p}%` }} />
              ))}
            </div>
            {stores.map(s => (
              <div key={s.store_name} className="mb-1.5 flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-right text-[10px] text-sub">{s.store_name}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className="h-3.5 rounded-r bg-brand hover:opacity-80"
                    style={{ width: `${Math.max(4, (s.sales / axisMax) * 100)}%` }}
                    title={`${s.store_name} — Sales: ${fmtMoney(s.sales)}`}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-32 shrink-0" />
              <div className="min-w-0 flex-1 border-t border-line pt-1">
                <div className="flex justify-between text-[9px] text-sub">
                  {ticks.map(tv => (
                    <span key={tv}>{fmtTick(tv)}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
