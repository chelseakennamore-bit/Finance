import { Card } from './Card';

export function StatTile({ label, value, color, big = false }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-mono font-bold mt-1.5 ${big ? 'text-[28px]' : 'text-[22px]'}`} style={color ? { color } : undefined}>
        {value}
      </div>
    </Card>
  );
}
