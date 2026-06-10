import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function AskGenie({ onAsk }: { onAsk: () => void }) {
  return (
    <button className="ask-genie" onClick={onAsk}>
      <Sparkles size={11} strokeWidth={2.2} /> Ask Genie
    </button>
  )
}

export function SectionHeader({ title, onAsk, right }: { title: ReactNode; onAsk?: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-3">
      <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      <div className="flex items-center gap-3">{right}{onAsk && <AskGenie onAsk={onAsk} />}</div>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sub text-[13px]">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
      {label}
    </div>
  )
}

export function GenieIcon({ size = 13 }: { size?: number }) {
  return <Sparkles size={size} className="text-warn" strokeWidth={2.2} />
}

export const toneClass = (tone: 'good' | 'bad' | 'neutral' | undefined) =>
  tone === 'good' ? 'tone-good' : tone === 'bad' ? 'tone-bad' : 'tone-neutral'

export const deltaClass = (v: number) => (v >= 0 ? 'tone-good' : 'tone-bad')
