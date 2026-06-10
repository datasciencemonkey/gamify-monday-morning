// STUB - built live by the component workflow (SecondaryKpis)
import { Card, Spinner } from './ui'
export default function SecondaryKpis({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie
  return <Card><Spinner label="Loading SecondaryKpis..." /></Card>
}
