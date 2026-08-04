import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { fmt } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RemoveButton } from '../ui/EditableCell';
import type { Assets } from '../../lib/types';

function AssetRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center">
      <label className="text-sm">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseClampedNumber(e.target.value))}
        className="w-[130px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
      />
    </div>
  );
}

export function NetWorth() {
  const assets = useFinanceStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const investments = useFinanceStore((s) => s.investments);
  const netWorthHistory = useFinanceStore((s) => s.netWorthHistory);
  const updateAsset = useFinanceStore((s) => s.updateAsset);
  const saveNetWorthSnapshot = useFinanceStore((s) => s.saveNetWorthSnapshot);
  const removeSnapshot = useFinanceStore((s) => s.removeSnapshot);

  const totalInvestments = useMemo(() => investments.reduce((sum, v) => sum + v.balance, 0), [investments]);
  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalAssets = assets.cash + assets.homeValue + assets.vehicles + assets.other + totalInvestments;
  const totalLiabilities = totalDebt;
  const netWorth = totalAssets - totalLiabilities;

  const setAsset = <K extends keyof Assets>(field: K, val: number) => updateAsset(field, val as Assets[K]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold m-0">Net Worth</h1>
        <p className="text-sm text-muted mt-1 mb-0">Assets minus liabilities, right now.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="text-[13px] font-semibold mb-3">Assets</div>
          <div className="flex flex-col gap-2.5">
            <AssetRow label="Cash & savings" value={assets.cash} onChange={(v) => setAsset('cash', v)} />
            <AssetRow label="Home value" value={assets.homeValue} onChange={(v) => setAsset('homeValue', v)} />
            <AssetRow label="Vehicles" value={assets.vehicles} onChange={(v) => setAsset('vehicles', v)} />
            <AssetRow label="Other assets" value={assets.other} onChange={(v) => setAsset('other', v)} />
            <div className="flex justify-between items-center">
              <label className="text-sm">Investments (total)</label>
              <span className="text-sm font-mono">{fmt(totalInvestments)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2.5 mt-1">
              <label className="text-sm font-bold">Total assets</label>
              <span className="text-sm font-bold font-mono">{fmt(totalAssets)}</span>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] font-semibold mb-3">Liabilities</div>
          <div className="flex flex-col gap-2.5">
            {debts.map((d) => (
              <div key={d.id} className="flex justify-between items-center">
                <label className="text-sm">{d.name}</label>
                <span className="text-sm font-mono">{fmt(d.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center border-t border-border pt-2.5 mt-1">
              <label className="text-sm font-bold">Total liabilities</label>
              <span className="text-sm font-bold font-mono">{fmt(totalLiabilities)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-[10px] p-6 flex justify-between items-center" style={{ background: 'oklch(24% 0.02 50)', color: 'oklch(94% 0.012 75)' }}>
        <div className="text-[15px] font-semibold">Net worth</div>
        <div className="text-[28px] font-bold font-mono">{fmt(netWorth)}</div>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-3.5">
          <div className="text-[13px] font-semibold">History</div>
          <Button variant="primary" onClick={() => saveNetWorthSnapshot(totalAssets, totalLiabilities, netWorth)}>
            Save today's snapshot
          </Button>
        </div>
        {netWorthHistory.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted py-2 px-2.5">Date</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Assets</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Liabilities</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Net worth</th>
                <th className="py-2 px-2.5" />
              </tr>
            </thead>
            <tbody>
              {netWorthHistory.map((h) => (
                <tr key={h.id}>
                  <td className="py-1.5 px-2.5 text-sm border-b border-rowborder">{h.date}</td>
                  <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(h.assets)}</td>
                  <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(h.liabilities)}</td>
                  <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(h.netWorth)}</td>
                  <td className="py-1.5 px-2.5 text-right border-b border-rowborder">
                    <RemoveButton onClick={() => removeSnapshot(h.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-subtle m-0">No snapshots yet — save one to start tracking net worth over time.</p>
        )}
      </Card>
    </div>
  );
}
