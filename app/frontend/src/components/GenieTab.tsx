// AI Genie chat tab - three-pane persistent chat room (DASH-15, AI-4).
import { useEffect, useRef, useState } from 'react'
import { Plus, SendHorizonal } from 'lucide-react'
import { api, type Conversation } from '../lib/api'
import { Card, GenieIcon, Spinner } from './ui'
import { GenieMarkdown, GenieTyping, runGenieAsk } from './AskGenieModal'

type Msg = { role: 'user' | 'assistant'; content: string; failed?: boolean }

export default function GenieTab() {
  const [convos, setConvos] = useState<Conversation[] | null>(null)
  const [convosError, setConvosError] = useState(false)
  const [activeCid, setActiveCid] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [sugError, setSugError] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const genieCidRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    api.conversations()
      .then(c => { if (alive) setConvos(c) })
      .catch(() => { if (alive) { setConvos([]); setConvosError(true) } })
    api.suggested()
      .then(s => { if (alive) setSuggestions(s) })
      .catch(() => { if (alive) { setSuggestions([]); setSugError(true) } })
    return () => {
      alive = false
      sessionRef.current += 1
    }
  }, [])

  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, progress, loadingMsgs])

  const newChat = () => {
    sessionRef.current += 1
    genieCidRef.current = null
    setActiveCid(null)
    setMsgs([])
    setBusy(false)
    setProgress(null)
    setLoadingMsgs(false)
    setInput('')
  }

  const openConversation = async (c: Conversation) => {
    sessionRef.current += 1
    const session = sessionRef.current
    genieCidRef.current = c.genie_conversation_id ?? null
    setActiveCid(c.conversation_id)
    setBusy(false)
    setProgress(null)
    setMsgs([])
    setLoadingMsgs(true)
    try {
      const m = await api.messages(c.conversation_id)
      if (sessionRef.current === session) setMsgs(m.map(x => ({ role: x.role, content: x.content })))
    } catch {
      if (sessionRef.current === session) setMsgs([{ role: 'assistant', content: '', failed: true }])
    } finally {
      if (sessionRef.current === session) setLoadingMsgs(false)
    }
  }

  const ask = async (raw: string) => {
    const question = raw.trim()
    if (!question || busy || loadingMsgs) return
    sessionRef.current += 1
    const session = sessionRef.current
    setInput('')
    setBusy(true)
    setProgress(null)
    setMsgs(m => [...m, { role: 'user', content: question }])
    try {
      let cid = activeCid
      if (!cid) {
        const created = await api.newConversation(question.slice(0, 48))
        if (sessionRef.current !== session) return
        const newCid = created.conversation_id
        cid = newCid
        setActiveCid(newCid)
        setConvos(prev => [
          { conversation_id: newCid, title: question.slice(0, 48), genie_conversation_id: null },
          ...(prev ?? []),
        ])
      }
      const userCid = cid
      api.saveMessage(userCid, 'user', question, genieCidRef.current).catch(() => {})
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
      if (content) {
        setMsgs(m => [...m, { role: 'assistant', content }])
        api.saveMessage(userCid, 'assistant', content, genieCidRef.current).catch(() => {})
      } else {
        setMsgs(m => [...m, { role: 'assistant', content: '', failed: true }])
      }
    } catch {
      if (sessionRef.current === session) setMsgs(m => [...m, { role: 'assistant', content: '', failed: true }])
    } finally {
      if (sessionRef.current === session) {
        setBusy(false)
        setProgress(null)
      }
    }
  }

  return (
    <div className="grid h-[600px] grid-cols-[230px_1fr_270px] gap-4">
      {/* LEFT - history rail */}
      <Card className="flex min-h-0 flex-col p-3">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[12px] font-medium hover:border-ink/40"
        >
          <Plus size={13} /> New Chat
        </button>
        <div className="metric-label mt-4 mb-2">History · Monday Morning</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convos === null ? (
            <div className="px-1 text-[11px] text-sub">Loading history…</div>
          ) : convosError ? (
            <div className="px-1 text-[11px] text-sub">History unavailable right now.</div>
          ) : convos.length === 0 ? (
            <div className="mt-8 text-center text-[11px] text-sub">No previous chats yet</div>
          ) : (
            convos.map(c => (
              <div
                key={c.conversation_id}
                onClick={() => void openConversation(c)}
                title={c.title}
                className={`cursor-pointer truncate rounded p-2 text-[11.5px] hover:bg-cream ${
                  activeCid === c.conversation_id ? 'bg-cream font-medium' : ''
                }`}
              >
                {c.title || 'Untitled chat'}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* CENTER - chat thread */}
      <Card className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <GenieIcon /> Ask Genie · Monday Morning
          </div>
          <div className="text-[10px] text-sub">🗂 Sales room · sales · margin · inventory · e-commerce</div>
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loadingMsgs ? (
            <Spinner label="Loading conversation…" />
          ) : msgs.length === 0 && !busy ? (
            <div className="mt-24 text-center">
              <div className="text-[15px] font-bold text-ink">Ask Genie</div>
              <div className="mt-1 text-[12px] text-sub">Click a suggested question or type your own below</div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void ask(input)
            }}
            placeholder="Ask a question about your CPG data…"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-[12px] outline-genie focus:outline-2 placeholder:text-sub/70"
          />
          <button
            onClick={() => void ask(input)}
            disabled={busy || loadingMsgs || !input.trim()}
            className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <SendHorizonal size={13} /> Ask
          </button>
        </div>
      </Card>

      {/* RIGHT - suggested questions */}
      <Card className="min-h-0 overflow-y-auto p-3">
        <div className="metric-label mb-2">Suggested Questions</div>
        {suggestions === null ? (
          <div className="text-[11px] text-sub">Loading…</div>
        ) : sugError ? (
          <div className="text-[11px] text-sub">Suggestions unavailable right now.</div>
        ) : suggestions.length === 0 ? (
          <div className="text-[11px] text-sub">No suggestions available.</div>
        ) : (
          suggestions.map((q, i) => (
            <div
              key={i}
              onClick={() => {
                if (!busy && !loadingMsgs) void ask(q)
              }}
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
