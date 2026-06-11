// DASH-4 · Executive Brief — Genie-polished summary of current-period KPIs.
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, type Brief, type BriefChip } from '../lib/api'
import { Card, GenieIcon, toneClass } from './ui'

type Phase = 'idle' | 'generating' | 'done' | 'error'

const MIN_GENERATING_MS = 1200

const chipBox = (tone: BriefChip['tone']) =>
  tone === 'good' ? 'border-good/40 bg-good/5'
    : tone === 'bad' ? 'border-bad/40 bg-bad/5'
    : 'border-line'

const chipValue = (tone: BriefChip['tone']) =>
  tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink'

function TitleRow() {
  return (
    <div className="flex items-center gap-1.5">
      <GenieIcon />
      <h3 className="text-[13px] font-bold text-ink">Executive Brief</h3>
    </div>
  )
}

export default function ExecutiveBrief() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [brief, setBrief] = useState<Brief | null>(null)

  const generate = async () => {
    if (phase === 'generating') return
    setPhase('generating')
    try {
      const [b] = await Promise.all([
        api.brief(),
        new Promise<void>(resolve => setTimeout(resolve, MIN_GENERATING_MS)),
      ])
      setBrief(b)
      setPhase('done')
    } catch {
      setBrief(null)
      setPhase('error')
    }
  }

  if (phase === 'done' && brief) {
    return (
      <Card className="px-5 py-4">
        <TitleRow />
        <p className="mt-2 text-[13px] leading-relaxed text-ink">{brief.headline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {brief.chips.map(c => (
            <div key={c.label} className={`rounded-md border px-2.5 py-1.5 ${chipBox(c.tone)}`}>
              <div className={`metric-label ${toneClass(c.tone)}`}>{c.label}</div>
              <div className={`text-[13px] font-bold ${chipValue(c.tone)}`}>{c.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink/85">{brief.detail}</p>
        <p className="mt-3 border-t border-line pt-2 text-[11px] italic text-sub">{brief.provenance}</p>
      </Card>
    )
  }

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <TitleRow />
          {phase === 'error' ? (
            <p className="mt-1.5 text-[12px] italic text-sub">
              The brief couldn't be generated right now — please try again in a moment.
            </p>
          ) : (
            <p className="mt-1.5 text-[12px] text-sub">
              Click <b className="font-semibold text-ink">Generate Brief</b> to have Genie polish the
              current-period KPIs into a 2-3 sentence executive summary with KPI chips.
            </p>
          )}
        </div>
        {phase === 'generating' ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand/15 px-3.5 py-1.5 text-[12px] font-semibold text-brand">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Generating…
          </span>
        ) : (
          <button
            onClick={generate}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
          >
            <Sparkles size={12} strokeWidth={2.2} /> Generate Brief
          </button>
        )}
      </div>
    </Card>
  )
}
