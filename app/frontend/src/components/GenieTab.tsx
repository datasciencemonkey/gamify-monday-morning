import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, SendHorizonal } from 'lucide-react'
import { api, type Conversation, type GenieResp } from '../lib/api'
import { Card, GenieIcon, Spinner } from './ui'
import { GenieMarkdown } from './AskGenieModal'

type Msg = { role: 'user' | 'assistant'; content: string; failed?: boolean }

const sleep = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms) })

export default function GenieTab() {
  const [convs, setConvs] = useState<Conversation[] | null>(null)
  const [suggested, setSuggested] = useState<string[] | null>(null)
  const [activeCid, setActiveCid] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const seqRef = useRef(0)
  const genieCidRef = useRef<string | null>(null)
  const activeCidRef = useRef<string | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    api.conversations().then(cs => { if (alive) setConvs(cs) }).catch(() => { if (alive) setConvs([]) })
    api.suggested().then(qs => { if (alive) setSuggested(qs) }).catch(() => { if (alive) setSuggested([]) })
    return () => {
      alive = false
      seqRef.current += 1
    }
  }, [])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy, progress, loadingMsgs])

  const setActive = (cid: string | null) => {
    activeCidRef.current = cid
    setActiveCid(cid)
  }

  const newChat = () => {
    seqRef.current += 1
    setActive(null)
    genieCidRef.current = null
    setMessages([])
    setLoadingMsgs(false)
    setBusy(false)
    setProgress('')
    setInput('')
  }

  const openConversation = async (c: Conversation) => {
    seqRef.current += 1
    const token = seqRef.current
    setActive(c.conversation_id)
    genieCidRef.current = c.genie_conversation_id ?? null
    setBusy(false)
    setProgress('')
    setMessages([])
    setLoadingMsgs(true)
    try {
      const msgs = await api.messages(c.conversation_id)
      if (token === seqRef.current) setMessages(msgs.map(m => ({ role: m.role, content: m.content })))
    } catch {
      if (token === seqRef.current) setMessages([])
    } finally {
      if (token === seqRef.current) setLoadingMsgs(false)
    }
  }

  const ask = async (raw: string) => {
    const q = raw.trim()
    if (!q || busy || loadingMsgs) return
    seqRef.current += 1
    const token = seqRef.current
    setMessages(m => [...m, { role: 'user', content: q }])
    setBusy(true)
    setProgress('')
    try {
      let cid = activeCidRef.current
      if (!cid) {
        try {
          const title = q.slice(0, 48)
          const created = await api.newConversation(title)
          cid = created.conversation_id
          setActive(cid)
          setConvs(cs => [{ conversation_id: created.conversation_id, title, genie_conversation_id: null }, ...(cs ?? [])])
        } catch {
          cid = null
        }
      }
      if (token !== seqRef.current) return
      if (cid) void api.saveMessage(cid, 'user', q, genieCidRef.current).catch(() => undefined)

      let resp: GenieResp = await api.genieAsk(q, genieCidRef.current)
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
        if (cid) void api.saveMessage(cid, 'assistant', text, genieCidRef.current).catch(() => undefined)
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

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    void ask(q)
  }

  return (
    <div className="grid h-[600px] grid-cols-[230px_1fr_270px] gap-4">
      <Card className="flex flex-col overflow-hidden p-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-line py-2 text-[12px] font-medium hover:border-ink/40"
        >
          <Plus size={13} /> New Chat
        </button>
        <div className="metric-label mt-4 mb-2">History · Monday Morning</div>
        <div className="flex-1 overflow-y-auto">
          {convs === null ? (
            <div className="px-1 text-[11px] text-sub">Loading history…</div>
          ) : convs.length === 0 ? (
            <div className="mt-8 text-center text-[11px] text-sub">No previous chats yet</div>
          ) : (
            convs.map(c => (
              <div
                key={c.conversation_id}
                onClick={() => void openConversation(c)}
                className={`cursor-pointer truncate rounded p-2 text-[11.5px] hover:bg-cream ${
                  activeCid === c.conversation_id ? 'bg-cream font-medium' : ''
                }`}
              >
                {c.title}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold">
            <GenieIcon /> Ask Genie · Monday Morning
          </div>
          <div className="text-[10px] text-sub">🗂 Sales room · sales · margin · inventory · e-commerce</div>
        </div>

        <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loadingMsgs ? (
            <Spinner label="Loading conversation…" />
          ) : messages.length === 0 && !busy ? (
            <div className="mt-24 text-center">
              <div className="text-[15px] font-bold">Ask Genie</div>
              <div className="mt-1 text-[12px] text-sub">Click a suggested question or type your own below</div>
            </div>
          ) : (
            <>
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="ml-auto w-fit max-w-[80%] rounded-lg bg-genie p-3 text-[12px] leading-relaxed text-white">
                    {m.content}
                  </div>
                ) : m.failed ? (
                  <div key={i} className="w-fit rounded-lg border border-line bg-cream/70 px-3 py-2 text-[12px] text-sub">
                    Genie is unavailable right now.
                  </div>
                ) : (
                  <div key={i} className="w-fit max-w-[92%] rounded-lg border border-line bg-white p-3">
                    <GenieMarkdown text={m.content} />
                  </div>
                )
              )}
              {busy && (
                <div className="space-y-1.5">
                  <div className="flex w-fit items-center gap-1 rounded-lg border border-line bg-white px-3 py-2.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-genie" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-genie [animation-delay:160ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-genie [animation-delay:320ms]" />
                  </div>
                  {progress && <div className="text-[10.5px] italic text-sub">{progress}</div>}
                </div>
              )}
            </>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about your CPG data…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-[12px] outline-genie"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <SendHorizonal size={13} /> Ask
          </button>
        </form>
      </Card>

      <Card className="overflow-y-auto p-3">
        <div className="metric-label mb-2">Suggested Questions</div>
        {suggested === null ? (
          <div className="text-[11px] text-sub">Loading…</div>
        ) : suggested.length === 0 ? (
          <div className="text-[11px] text-sub">No suggestions available.</div>
        ) : (
          suggested.map(q => (
            <div
              key={q}
              onClick={() => void ask(q)}
              className="mb-2 cursor-pointer rounded-lg border border-line p-2.5 text-[11px] leading-snug hover:border-genie/60 hover:bg-genie/5"
            >
              {q}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
