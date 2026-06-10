import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, type Brief, type BriefChip } from '../lib/api'
import { Card, GenieIcon, toneClass } from './ui'

type Status = 'idle' | 'generating' | 'done' | 'error'

const MIN_GENERATING_MS = 1200
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const chipBox = (tone: BriefChip['tone']) =>
  tone === 'good' ? 'border-good/40 bg-good/5'
    : tone === 'bad' ? 'border-bad/40 bg-bad/5'
    : 'border-line'

const chipValue = (tone: BriefChip['tone']) =>
  tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink'

export default function ExecutiveBrief() {
  const [status, setStatus] = useState<Status>('idle')
  const [brief, setBrief] = useState<Brief | null>(null)

  const generate = async () => {
    if (status === 'generating') return
    setStatus('generating')
    const started = Date.now()
    let next: Brief | null = null
    try {
      next = await api.brief()
    } catch {
      next = null
    }
    const remaining = MIN_GENERATING_MS - (Date.now() - started)
    if (remaining > 0) await sleep(remaining)
    if (next) {
      setBrief(next)
      setStatus('done')
    } else {
      setStatus('error')
    }
  }

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <GenieIcon />
            <h3 className="text-[13px] font-bold text-ink">Executive Brief</h3>
          </div>
          {(status === 'idle' || status === 'generating') && (
            <p className="mt-1.5 text-[12px] text-sub">
              Click <b>Generate Brief</b> to have Genie polish the current-period KPIs into a 2-3
              sentence executive summary with KPI chips.
            </p>
          )}
          {status === 'error' && (
            <p className="mt-1.5 text-[12px] text-sub">
              Genie couldn't generate the brief right now — please try again in a moment.
            </p>
          )}
        </div>
        {status === 'generating' && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand/15 px-3.5 py-1.5 text-[12px] font-semibold text-brand">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Generating…
          </span>
        )}
        {(status === 'idle' || status === 'error') && (
          <button
            onClick={() => { void generate() }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
          >
            <Sparkles size={12} strokeWidth={2.2} /> Generate Brief
          </button>
        )}
      </div>

      {status === 'done' && brief && (
        <div className="mt-2.5">
          <p className="text-[13px] leading-relaxed text-ink">{brief.headline}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {brief.chips.map(chip => (
              <div key={chip.label} className={`rounded-md border px-2.5 py-1.5 ${chipBox(chip.tone)}`}>
                <div className={`metric-label ${toneClass(chip.tone)}`}>{chip.label}</div>
                <div className={`text-[13px] font-bold ${chipValue(chip.tone)}`}>{chip.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink/85">{brief.detail}</p>
          <p className="mt-3 border-t border-line pt-2 text-[11px] italic text-sub">{brief.provenance}</p>
        </div>
      )}
    </Card>
  )
}
