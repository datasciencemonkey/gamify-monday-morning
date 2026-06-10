// STUB - built live by the component workflow (AskGenieModal). Contract: keep these exports.
export type GenieCtx = { title: string; prompt: string }
export default function AskGenieModal({ ctx, onClose }: { ctx: GenieCtx | null; onClose: () => void }) {
  if (!ctx) return null
  return <div onClick={onClose} className="fixed inset-0 bg-black/30 z-50" />
}
