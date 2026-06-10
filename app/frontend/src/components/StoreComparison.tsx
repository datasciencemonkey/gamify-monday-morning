// STUB - replaced by workflow agent (StoreComparison)
import { Card, Spinner } from './ui'
export default function StoreComparison({ level, name }: { level: 'category' | 'subcategory'; name: string }) {
  void level; void name
  return <Card><Spinner label="Loading store comparison..." /></Card>
}
