import { useState } from 'react'
import { ChevronLeft, Sparkles, Boxes, Layers } from 'lucide-react'
import AskGenieModal, { type GenieCtx } from './components/AskGenieModal'
import KpiGrid from './components/KpiGrid'
import ExecutiveBrief from './components/ExecutiveBrief'
import TrendChart from './components/TrendChart'
import CategoryDonut from './components/CategoryDonut'
import CategoryKpisTable from './components/CategoryKpisTable'
import MoversCards from './components/MoversCards'
import SecondaryKpis from './components/SecondaryKpis'
import InventoryTable from './components/InventoryTable'
import DrilldownTable from './components/DrilldownTable'
import GenieTab from './components/GenieTab'

const TABS = ['Executive Summary', 'Detailed Breakdown', 'AI Genie'] as const
type Tab = typeof TABS[number]
const NAV = ['01 Sales', '02 Demand', '03 Audience', '04 In-Store', '05 Measurement']

export default function App() {
  const [tab, setTab] = useState<Tab>('Executive Summary')
  const [genieCtx, setGenieCtx] = useState<GenieCtx | null>(null)
  const openGenie = (title: string, prompt: string) => setGenieCtx({ title, prompt })

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-line">
        <div className="mx-auto flex h-12 max-w-[1060px] items-center gap-3 px-5 text-[12px]">
          <button className="flex items-center gap-1 text-sub hover:text-ink"><ChevronLeft size={14} /> Back</button>
          <span className="flex items-center gap-1.5 font-bold text-[13px]">
            <Boxes size={16} className="text-brand" /> databricks
          </span>
          <span className="text-line">/</span>
          <span className="rounded border border-good/40 bg-good/5 px-1 text-[10px] font-mono text-good">01</span>
          <span className="font-bold">Sales Performance</span>
          <nav className="mx-auto flex items-center gap-1">
            {NAV.map((n, i) => (
              <button key={n} className={i === 0
                ? 'rounded-md bg-ink px-2.5 py-1 font-semibold text-white'
                : 'rounded-md px-2.5 py-1 text-sub hover:text-ink'}>{n}</button>
            ))}
          </nav>
          <button className="flex items-center gap-1 font-semibold text-brand"><Sparkles size={12} /> Multi-Agent Genie</button>
          <button className="flex items-center gap-1 font-semibold text-brand"><Layers size={12} /> Architecture</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-5 pb-16">
        <div className="flex items-start justify-between pt-6">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight">Monday Morning</h1>
            <p className="font-mono text-[12px] tracking-wide text-sub">CPG Retail Insights</p>
          </div>
          <span className="mt-2 flex items-center gap-1.5 rounded-full border border-good/30 bg-good/10 px-2.5 py-0.5 text-[11px] font-medium text-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> Live
          </span>
        </div>

        <div className="mt-4 inline-flex rounded-lg border border-line bg-[#efece5] p-0.5 text-[12px]">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3.5 py-1.5 font-medium transition ${tab === t
                ? t === 'AI Genie' ? 'bg-[#e5a33c] text-white shadow-sm' : 'bg-white shadow-sm border border-line'
                : 'text-sub hover:text-ink'}`}>
              {t === 'AI Genie' ? <span className="flex items-center gap-1"><Sparkles size={11} /> AI Genie</span> : t}
            </button>
          ))}
        </div>

        {tab === 'Executive Summary' && (
          <div className="mt-5 space-y-5">
            <KpiGrid openGenie={openGenie} />
            <ExecutiveBrief />
            <div className="grid grid-cols-2 gap-5">
              <TrendChart openGenie={openGenie} />
              <CategoryDonut openGenie={openGenie} />
            </div>
            <CategoryKpisTable openGenie={openGenie} />
            <MoversCards openGenie={openGenie} />
            <SecondaryKpis openGenie={openGenie} />
            <InventoryTable openGenie={openGenie} />
          </div>
        )}
        {tab === 'Detailed Breakdown' && <div className="mt-5"><DrilldownTable openGenie={openGenie} /></div>}
        {tab === 'AI Genie' && <div className="mt-5"><GenieTab /></div>}
      </main>

      <AskGenieModal ctx={genieCtx} onClose={() => setGenieCtx(null)} />
    </div>
  )
}
