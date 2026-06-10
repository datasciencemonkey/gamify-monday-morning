// STUB - replaced by workflow agent (DrilldownTable)
import { Card, Spinner } from './ui'
export default function DrilldownTable({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie
  return <Card><Spinner label="Loading DrilldownTable..." /></Card>
}
