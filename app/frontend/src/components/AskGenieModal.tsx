// AskGenieModal - contextual Ask Genie overlay (DASH-11, AI-1) + shared Genie helpers.
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { SendHorizonal, X } from 'lucide-react'
import { api, type GenieResp } from '../lib/api'
import { Card, GenieIcon } from './ui'

export type GenieCtx = { title: string; prompt: string }

// ---------------------------------------------------------------------------
// Shared Genie ask + poll loop (3s cadence, cancellable). Used by GenieTab too.
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

export async function runGenieAsk(opts: {
  question: string
  genieConversationId: string | null
  isCancelled: () => boolean
  onProgress: (step: string) => void
}): Promise<GenieResp | null> {
  const { question, genieConversationId, isCancelled, onProgress } = opts
  let resp = await api.genieAsk(question, genieConversationId)
  if (isCancelled()) return null
  while (resp.status === 'in_progress') {
    const steps = resp.progress_steps ?? []
    if (steps.length) onProgress(steps[steps.length - 1])
    if (!resp.conversation_id || !resp.response_id) break
    await sleep(3000)
    if (isCancelled()) return null
    resp = await api.geniePoll(resp.conversation_id, resp.response_id)
    if (isCancelled()) return null
  }
  return resp
}

// ---------------------------------------------------------------------------
// Typing indicator: three pulsing dots + latest progress step (italic).
// ---------------------------------------------------------------------------
export function GenieTyping({ progress }: { progress?: string | null }) {
  return (
    <div className="space-y-1.5">
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5">
        {[0, 1, 2].map(d => (
          <span key={d} className="h-1.5 w-1.5 rounded-full bg-genie/80 animate-pulse"
            style={{ animationDelay: `${d * 0.18}s` }} />
        ))}
      </div>
      {progress ? <div className="italic text-[10.5px] text-sub">{progress}</div> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// GenieMarkdown - the ONE shared lightweight renderer for Genie answers.
// Handles **bold**, [label](url), | tables (with exec-grade number formatting),
// ##/### headings, skips <!-- comments --> and <details> blocks.
// ---------------------------------------------------------------------------
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b${i}`} className="font-semibold">{m[1]}</strong>)
    } else {
      out.push(
        <a key={`${keyPrefix}-a${i}`} className="text-genie underline" target="_blank" rel="noreferrer" href={m[3]}>
          {m[2]}
        </a>,
      )
    }
    last = m.index + m[0].length
    i += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// total_sales -> Total Sales (also title-cases plain lowercase headers).
function humanizeHeader(raw: string): string {
  const t = raw.trim().replace(/[`*]/g, '')
  if (!t) return t
  if (/^[a-z0-9_ ]+$/.test(t)) {
    return t.split(/[_ ]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return t
}

const ID_HEADER_RE = /(upc|sku|_id\b|^id$|code|zip|phone|year\b)/i
const MONEY_HEADER_RE = /(sales|revenue|price|cost|amount|gmv|aov|spend|dollar|\$)/i
const PCT_HEADER_RE = /(pct|percent|rate|share|growth|yoy|mom|lift|conversion|conv\b|attach|in_stock|penetration|vs_plan|vs_py)/i

// Formats raw numeric cell values: 250585.68999999992 -> $250,586 when money-like,
// percents to 1 decimal, plain counts with thousands separators. null = not numeric.
function formatNumberCell(raw: string, header: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || ID_HEADER_RE.test(header)) return null
  const hasDollar = trimmed.includes('$')
  const hasPct = trimmed.endsWith('%')
  const cleaned = trimmed.replace(/[$,%]/g, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned) || /^0\d/.test(cleaned)) return null
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  const h = header.toLowerCase()
  const pctHeader = PCT_HEADER_RE.test(h)
  const moneyHeader = MONEY_HEADER_RE.test(h) && !pctHeader
  const asPct = () => {
    const v = Math.abs(n) < 1 && cleaned.includes('.') ? n * 100 : n
    return `${v.toFixed(1)}%`
  }
  const asMoney = () => {
    const sign = n < 0 ? '-' : ''
    const a = Math.abs(n)
    return a >= 1000 ? `${sign}$${Math.round(a).toLocaleString('en-US')}` : `${sign}$${a.toFixed(2)}`
  }
  if (hasPct || pctHeader) return asPct()
  if (hasDollar || moneyHeader) return asMoney()
  if (h.includes('margin')) return Math.abs(n) >= 1000 ? asMoney() : asPct()
  return Number.isInteger(n)
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function MdTable({ lines }: { lines: string[] }) {
  const rows = lines
    .map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
    .filter(cells => !(cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c) || c === '')))
  if (!rows.length) return null
  const [header, ...data] = rows
  return (
    <div className="my-1.5 overflow-x-auto">
      <table className="min-w-full border border-line text-[11.5px]">
        <thead>
          <tr>
            {header.map((hc, hi) => (
              <th key={hi} className="whitespace-nowrap border-b border-line bg-cream/70 px-2.5 py-1.5 text-left font-semibold text-ink">
                {humanizeHeader(hc)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-cream/30' : ''}>
              {r.map((c, ci) => {
                const num = formatNumberCell(c, header[ci] ?? '')
                return (
                  <td key={ci} className={`whitespace-nowrap border-b border-line/60 px-2.5 py-1 ${num !== null ? 'text-right tabular-nums' : 'text-left'}`}>
                    {num !== null ? num : renderInline(c, `c${ri}-${ci}`)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GenieMarkdown({ text }: { text: string }) {
  const lines = (text ?? '').split(/\r?\n/)
  const out: ReactNode[] = []
  let table: string[] = []
  let inDetails = false
  let inComment = false
  const flush = () => {
    if (table.length) {
      out.push(<MdTable key={`t${out.length}`} lines={table} />)
      table = []
    }
  }
  lines.forEach((rawLine, idx) => {
    const t = rawLine.trim()
    if (inComment) {
      if (t.includes('-->')) inComment = false
      return
    }
    if (t.startsWith('<!--')) {
      if (!t.includes('-->')) inComment = true
      return
    }
    if (inDetails) {
      if (t.startsWith('</details')) inDetails = false
      return
    }
    if (t.startsWith('<details')) {
      if (!t.includes('</details')) inDetails = true
      return
    }
    if (t.startsWith('|')) {
      table.push(t)
      return
    }
    flush()
    const h = /^(#{2,3})\s+(.*)$/.exec(t)
    if (h) {
      out.push(<div key={idx} className="mt-1 text-[12.5px] font-bold text-ink">{renderInline(h[2], `h${idx}`)}</div>)
      return
    }
    if (!t) {
      out.push(<div key={idx} className="h-1" />)
      return
    }
    out.push(
      <div key={idx} className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">
        {renderInline(rawLine, `p${idx}`)}
      </div>,
    )
  })
  flush()
  return <div className="space-y-0.5">{out}</div>
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
type Msg = { role: 'user' | 'assistant'; content: string; failed?: boolean }

export default function AskGenieModal({ ctx, onClose }: { ctx: GenieCtx | null; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const genieCidRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const run = async (question: string, session: number) => {
    setBusy(true)
    setProgress(null)
    try {
      const resp = await runGenieAsk({
        question,
        genieConversationId: genieCidRef.current,
        isCancelled: () => sessionRef.current !== session,
        onProgress: s => {
          if (sessionRef.current === session) setProgress(s)
        },
      })
      if (!resp || sessionRef.current !== session) return
      if (resp.conversation_id) genieCidRef.current = resp.conversation_id
      const content = resp.status === 'completed' ? (resp.content || resp.final_answer || '') : ''
      setMsgs(m => [...m, content
        ? { role: 'assistant', content }
        : { role: 'assistant', content: '', failed: true }])
    } catch {
      if (sessionRef.current === session) setMsgs(m => [...m, { role: 'assistant', content: '', failed: true }])
    } finally {
      if (sessionRef.current === session) {
        setBusy(false)
        setProgress(null)
      }
    }
  }

  // Reset everything whenever ctx changes (open / close); auto-send prompt on open.
  useEffect(() => {
    sessionRef.current += 1
    const session = sessionRef.current
    genieCidRef.current = null
    setBusy(false)
    setProgress(null)
    setInput('')
    if (ctx) {
      setMsgs([{ role: 'user', content: ctx.prompt }])
      void run(ctx.prompt, session)
    } else {
      setMsgs([])
    }
    return () => {
      sessionRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, progress])

  if (!ctx) return null

  const submit = () => {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', content: q }])
    void run(q, sessionRef.current)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 pt-24 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>
        <Card className="flex max-h-[68vh] w-[600px] flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
              <GenieIcon /> Ask Genie: {ctx.title}
            </div>
            <button onClick={onClose} aria-label="Close" className="text-sub hover:text-ink">
              <X size={15} />
            </button>
          </div>

          <div ref={bodyRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="rounded-lg bg-genie p-3 text-[12px] leading-relaxed text-white">
                  {m.content}
                </div>
              ) : m.failed ? (
                <div key={i} className="rounded-lg border border-line bg-cream/70 p-3 text-[12px] text-sub">
                  Genie is unavailable right now.
                </div>
              ) : (
                <div key={i} className="rounded-lg border border-line bg-white p-3">
                  <GenieMarkdown text={m.content} />
                </div>
              ),
            )}
            {busy && <GenieTyping progress={progress} />}
          </div>

          <div className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="Ask a follow-up question…"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-[12px] outline-genie focus:outline-2 placeholder:text-sub/70"
            />
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="rounded-lg bg-genie/90 px-3 text-white hover:bg-genie disabled:opacity-50"
            >
              <SendHorizonal size={14} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
