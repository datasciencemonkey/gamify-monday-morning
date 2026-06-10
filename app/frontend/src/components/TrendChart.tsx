// STUB - replaced by workflow agent (TrendChart)
import { Card, Spinner } from './ui'
export default function TrendChart({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie
  return <Card><Spinner label="Loading TrendChart..." /></Card>
}
