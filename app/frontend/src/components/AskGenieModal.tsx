import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { SendHorizonal, Sparkles, X } from 'lucide-react'
import { api, type GenieResp } from '../lib/api'
import { Card } from './ui'

export type GenieCtx = { title: string; prompt: string }

type Msg = { role: 'user' | 'assistant'; content: string; failed?: boolean }

const sleep = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms) })

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let n = 0
  let m = re.exec(text)
  while (m) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyBase}-${n}`} className="font-semibold">{m[1]}</strong>)
    } else {
      nodes.push(
        <a key={`${keyBase}-${n}`} href={m[3]} target="_blank" rel="noreferrer" className="text-genie underline">
          {m[2]}
        </a>
      )
    }
    last = m.index + m[0].length
    n += 1
    m = re.exec(text)
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const cleanNum = (s: string) => s.trim().replace(/[$,%]/g, '')

const isNumericCell = (s: string) => {
  const c = cleanNum(s)
  return c !== '' && /^-?\d+(\.\d+)?$/.test(c)
}

function formatCell(cell: string, header: string): string {
  if (!isNumericCell(cell)) return cell
  const cleaned = cleanNum(cell)
  const num = Number(cleaned)
  const h = header.toLowerCase()
  if (h.includes('pct') || h.includes('%')) return `${num.toFixed(1)}%`
  if (/(sales|margin|amount|amt|revenue)/.test(h)) return `$${Math.round(num).toLocaleString('en-US')}`
  const decimals = (cleaned.split('.')[1] ?? '').length
  if (decimals > 2) return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return cell
}

export function GenieMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let inComment = false
  let inDetails = false
  while (i < lines.length) {
    const raw = lines[i]
    const t = raw.trim()
    if (inComment) {
      if (t.includes('-->')) inComment = false
      i += 1
      continue
    }
    if (inDetails) {
      if (t.includes('</details>')) inDetails = false
      i += 1
      continue
    }
    if (t.startsWith('<!--')) {
      if (!t.includes('-->')) inComment = true
      i += 1
      continue
    }
    if (t.startsWith('<details')) {
      if (!t.includes('</details>')) inDetails = true
      i += 1
      continue
    }
    if (t.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
        const isSep =
          cells.length > 0 &&
          cells.some(c => /^:?-{2,}:?$/.test(c)) &&
          cells.every(c => c === '' || /^:?-{2,}:?$/.test(c))
        if (!isSep) rows.push(cells)
        i += 1
      }
      if (rows.length > 0) {
        const [header, ...body] = rows
        const colNumeric = header.map((_, ci) => body.some(r => isNumericCell(r[ci] ?? '')))
        blocks.push(
          <div key={blocks.length} className="overflow-x-auto">
            <table className="my-1 w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-line bg-cream/60">
                  {header.map((c, ci) => (
                    <th
                      key={ci}
                      className={`whitespace-nowrap px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-sub ${colNumeric[ci] ? 'text-right' : 'text-left'}`}
                    >
                      {c.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri} className="border-b border-line last:border-b-0">
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        className={`px-2 py-1 align-top ${isNumericCell(c) ? 'whitespace-nowrap text-right' : 'text-left'}`}
                      >
                        {isNumericCell(c) ? formatCell(c, header[ci] ?? '') : renderInline(c, `c${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }
    if (/^#{2,}/.test(t)) {
      blocks.push(
        <div key={blocks.length} className="text-[12.5px] font-bold">
          {renderInline(t.replace(/^#+\s*/, ''), `h${i}`)}
        </div>
      )
      i += 1
      continue
    }
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = []
      const start = i
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul key={blocks.length} className="my-1 list-disc space-y-1 pl-4 text-[12px] leading-relaxed">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `li${start}-${ii}`)}</li>
          ))}
        </ul>
      )
      continue
    }
    if (t === '') {
      blocks.push(<div key={blocks.length} className="h-1" />)
      i += 1
      continue
    }
    blocks.push(
      <div key={blocks.length} className="whitespace-pre-wrap text-[12px] leading-relaxed">
        {renderInline(raw, `p${i}`)}
      </div>
    )
    i += 1
  }
  return <div>{blocks}</div>
}

function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-[#eceef2] px-3 py-2.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/60" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/60 [animation-delay:160ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/60 [animation-delay:320ms]" />
    </div>
  )
}

export default function AskGenieModal({ ctx, onClose }: { ctx: GenieCtx | null; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const seqRef = useRef(0)
  const genieCidRef = useRef<string | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const run = async (question: string, token: number) => {
    setMessages(m => [...m, { role: 'user', content: question }])
    setBusy(true)
    setProgress('')
    try {
      let resp: GenieResp = await api.genieAsk(question, genieCidRef.current)
      if (token !== seqRef.current) return
      if (resp.conversation_id) genieCidRef.current = resp.conversation_id
      let gcid = resp.conversation_id
      let rid = resp.response_id
      while (resp.status === 'in_progress' && gcid && rid) {
        const steps = resp.progress_steps ?? []
        setProgress(steps.length ? steps[steps.length - 1] : '')
        await sleep(3000)
        if (token !== seqRef.current) return
        resp = await api.geniePoll(gcid, rid)
        if (token !== seqRef.current) return
        if (resp.conversation_id) {
          gcid = resp.conversation_id
          genieCidRef.current = resp.conversation_id
        }
        if (resp.response_id) rid = resp.response_id
      }
      const text = resp.content || resp.final_answer || ''
      if (resp.status !== 'failed' && resp.status !== 'in_progress' && text) {
        setMessages(m => [...m, { role: 'assistant', content: text }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: '', failed: true }])
      }
    } catch {
      if (token === seqRef.current) setMessages(m => [...m, { role: 'assistant', content: '', failed: true }])
    } finally {
      if (token === seqRef.current) {
        setBusy(false)
        setProgress('')
      }
    }
  }

  useEffect(() => {
    seqRef.current += 1
    const token = seqRef.current
    genieCidRef.current = null
    setMessages([])
    setInput('')
    setBusy(false)
    setProgress('')
    if (ctx) void run(ctx.prompt, token)
    return () => {
      seqRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy, progress])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    void run(q, seqRef.current)
  }

  if (!ctx) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 pt-24 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div className="w-[480px] max-w-[94vw]" onClick={e => e.stopPropagation()}>
        <Card className="flex max-h-[68vh] w-full flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold">
              <Sparkles size={13} strokeWidth={2.2} className="text-genie" /> Ask Genie: {ctx.title}
            </div>
            <button onClick={onClose} aria-label="Close" className="text-sub hover:text-ink">
              <X size={15} />
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto w-fit max-w-[88%] rounded-lg bg-genie p-3 text-[12px] leading-relaxed text-white">
                  {m.content}
                </div>
              ) : m.failed ? (
                <div key={i} className="w-fit rounded-lg border border-line bg-cream/70 px-3 py-2 text-[12px] text-sub">
                  Genie is unavailable right now.
                </div>
              ) : (
                <div key={i} className="w-fit max-w-full rounded-lg border border-line bg-white p-3">
                  <GenieMarkdown text={m.content} />
                </div>
              )
            )}
            {busy && (
              <div className="space-y-1.5">
                <TypingDots />
                {progress && <div className="text-[10.5px] italic text-sub">{progress}</div>}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a follow-up question…"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-[12px] outline-none focus:border-genie focus:ring-2 focus:ring-genie/15"
            />
            <button
              type="submit"
              disabled={busy}
              aria-label="Send"
              className="rounded-lg bg-genie/90 px-3 text-white hover:bg-genie disabled:opacity-50"
            >
              <SendHorizonal size={14} />
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
