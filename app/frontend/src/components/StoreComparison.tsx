import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import {
  MapContainer as RLMapContainer, TileLayer as RLTileLayer,
  CircleMarker as RLCircleMarker, Tooltip as RLTooltip, Popup as RLPopup,
} from 'react-leaflet'
import { api, fmtMoney, type StoreComp } from '../lib/api'
import { Card, Spinner } from './ui'

// @types/leaflet is not installed, so react-leaflet props inherited from leaflet's
// option interfaces don't surface. Re-type the components (type-level only) with the
// exact props used here.
const MapContainer = RLMapContainer as unknown as ComponentType<{
  center: [number, number]; zoom: number; scrollWheelZoom: boolean; className: string; children: ReactNode
}>
const TileLayer = RLTileLayer as unknown as ComponentType<{ url: string; attribution: string }>
const CircleMarker = RLCircleMarker as unknown as ComponentType<{
  center: [number, number]; radius: number;
  pathOptions: { color: string; fillColor: string; fillOpacity: number; weight: number };
  children: ReactNode
}>
const Tooltip = RLTooltip as unknown as ComponentType<{ children: ReactNode }>
const Popup = RLPopup as unknown as ComponentType<{ children: ReactNode }>

const bandColor = (inStock: number | null) =>
  inStock != null && inStock >= 90 ? '#169a53' : inStock != null && inStock >= 80 ? '#e8a13d' : '#e0312b'

export default function StoreComparison({ level, name }: { level: 'category' | 'subcategory'; name: string }) {
  const [data, setData] = useState<StoreComp | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let live = true
    api.storeComparison(level, name)
      .then(d => { if (live) setData(d) })
      .catch(() => { if (live) setErr(true) })
    return () => { live = false }
  }, [level, name])

  if (err) {
    return (
      <Card>
        <div className="px-5 py-10 text-center text-[12px] text-sub">Store comparison unavailable for {name}.</div>
      </Card>
    )
  }
  if (!data) return <Card><Spinner label="Loading store comparison..." /></Card>

  const maxSales = Math.max(...data.stores.map(s => s.sales), 1)

  return (
    <Card>
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-brand shrink-0" />
            <h3 className="text-[13px] font-bold text-ink">Store comparison — {name}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-sub">
            {level === 'category' ? 'Category' : 'Subcategory'} · current month sales across all 15 stores
          </p>
        </div>
        {data.top_store && (
          <div className="text-right">
            <div className="metric-label">Top store</div>
            <div className="text-[12px] font-bold text-ink">{data.top_store.store_name}</div>
            <div className="text-[11px] text-sub">
              {fmtMoney(data.top_store.sales)} · {data.top_store.share}% of total
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 px-5 pb-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="metric-label">Geographic distribution (NY/NJ/CT)</span>
            <span className="flex items-center gap-2 whitespace-nowrap text-[10px] text-sub">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-good" />≥90% stock</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warn" />80–90%</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-bad" />{'<'}80%</span>
            </span>
          </div>
          <MapContainer center={[40.83, -73.95]} zoom={9} scrollWheelZoom={false} className="h-72 w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM contributors" />
            {data.stores.map(s => (
              <CircleMarker
                key={s.store_name}
                center={[s.latitude, s.longitude]}
                radius={6 + 14 * Math.sqrt(s.sales / maxSales)}
                pathOptions={{
                  color: bandColor(s.in_stock),
                  fillColor: bandColor(s.in_stock),
                  fillOpacity: 0.75,
                  weight: 1,
                }}
              >
                <Tooltip>{s.store_name}</Tooltip>
                <Popup>
                  <div className="text-[11px] leading-4">
                    <div className="font-bold">{s.store_name}</div>
                    <div className="text-sub">{s.city}, {s.state}</div>
                    <div className="mt-1">Sales: {fmtMoney(s.sales)}</div>
                    <div>Units: {s.units.toLocaleString()}</div>
                    <div>In-stock: {s.in_stock != null ? `${s.in_stock}%` : '—'}</div>
                    <div>On-hand: {s.on_hand != null ? s.on_hand.toLocaleString() : '—'}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div>
          <div className="metric-label mb-2">Sales by store (sorted)</div>
          <div className="pt-1">
            {data.stores.map(s => (
              <div key={s.store_name} className="mb-1.5 flex items-center gap-2">
                <span className="w-32 truncate text-right text-[10px] text-sub">{s.store_name}</span>
                <div className="flex-1">
                  <div
                    className="h-3.5 rounded-r bg-brand hover:opacity-80"
                    style={{ width: `${Math.max(4, (s.sales / maxSales) * 100)}%` }}
                    title={`${s.store_name} — Sales: ${fmtMoney(s.sales)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
