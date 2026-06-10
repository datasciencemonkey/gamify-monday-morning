// STUB - built live by the component workflow (MoversCards)
import { Card, Spinner } from './ui'
export default function MoversCards({ openGenie }: { openGenie: (title: string, prompt: string) => void }) {
  void openGenie
  return <Card><Spinner label="Loading MoversCards..." /></Card>
}
