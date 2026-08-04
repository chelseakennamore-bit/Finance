import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { exportCSV, importCSV } from '../../lib/csv';
import { fmt } from '../../lib/format';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberCell, RemoveButton, TextCell } from '../ui/EditableCell';
import { StatTile } from '../ui/StatTile';
import type { Investment } from '../../lib/types';

const ALLOCATION_COLORS = [
  'oklch(58% 0.1 40)',
  'oklch(56% 0.09 145)',
  'oklch(55% 0.12 250)',
  'oklch(60% 0.12 300)',
  'oklch(55% 0.14 25)',
  'oklch(65% 0.12 90)',
];

export function Investments() {
  const investments = useFinanceStore((s) => s.investments);
  const updateInvestment = useFinanceStore((s) => s.updateInvestment);
  const addInvestment = useFinanceStore((s) => s.addInvestment);
  const removeInvestment = useFinanceStore((s) => s.removeInvestment);
  const setInvestments = useFinanceStore((s) => s.setInvestments);

  const totalInvestments = useMemo(() => investments.reduce((sum, v) => sum + v.balance, 0), [investments]);
  const totalMonthlyContribution = useMemo(() => investments.reduce((sum, v) => sum + v.contribution, 0), [investments]);

  const allocationByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of investments) {
      const type = v.type.trim() || 'Other';
      map.set(type, (map.get(type) || 0) + v.balance);
    }
    return Array.from(map.entries())
      .map(([type, balance]) => ({ type, balance }))
      .sort((a, b) => b.balance - a.balance);
  }, [investments]);

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importCSV<Investment>(
      file,
      [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'balance', label: 'Balance', numeric: true },
        { key: 'contribution', label: 'Contribution', numeric: true },
      ],
      (rows) => setInvestments(rows)
    );
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold m-0">Investments</h1>
          <p className="text-sm text-muted mt-1 mb-0">Accounts, balances, and monthly contributions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              exportCSV('investments.csv', investments, [
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'balance', label: 'Balance' },
                { key: 'contribution', label: 'Contribution' },
              ])
            }
          >
            Export CSV
          </Button>
          <Button
            onClick={() =>
              exportCSV(
                'investments-template.csv',
                [
                  { id: 0, name: '401(k)', type: '401(k)', balance: 50000, contribution: 500 },
                  { id: 0, name: 'Roth IRA', type: 'Roth IRA', balance: 20000, contribution: 300 },
                ],
                [
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'balance', label: 'Balance' },
                  { key: 'contribution', label: 'Contribution' },
                ]
              )
            }
          >
            Download template
          </Button>
          <label className="px-3.5 py-2 rounded-md border border-inputborder bg-tile text-tile-text text-[13px] cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <Button variant="primary" onClick={addInvestment}>
            + Add account
          </Button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatTile label="Total balance" value={fmt(totalInvestments)} />
        <StatTile label="Monthly contributions" value={fmt(totalMonthlyContribution)} />
      </div>

      {totalInvestments > 0 && (
        <Card className="p-6">
          <div className="text-[13px] font-semibold mb-3">Allocation by type</div>
          <div className="flex w-full h-3.5 rounded-full overflow-hidden" style={{ background: 'oklch(92% 0.008 70)' }}>
            {allocationByType.map((a, i) => (
              <div
                key={a.type}
                className="h-3.5"
                style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], width: `${(a.balance / totalInvestments) * 100}%` }}
                title={`${a.type}: ${fmt(a.balance)}`}
              />
            ))}
          </div>
          <div className="flex gap-x-5 gap-y-1.5 mt-3 text-xs font-mono text-muted flex-wrap">
            {allocationByType.map((a, i) => (
              <div key={a.type} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                />
                {a.type}: {((a.balance / totalInvestments) * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="px-4 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase text-muted p-2.5">Account</th>
              <th className="text-left text-[11px] uppercase text-muted p-2.5">Type</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Balance</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Contribution/mo</th>
              <th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {investments.map((v) => (
              <tr key={v.id}>
                <td className="p-1.5 px-2.5 border-b border-rowborder">
                  <TextCell value={v.name} onChange={(val) => updateInvestment(v.id, 'name', val)} fallback="Unnamed account" />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder">
                  <TextCell value={v.type} onChange={(val) => updateInvestment(v.id, 'type', val)} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={v.balance} onChange={(val) => updateInvestment(v.id, 'balance', val)} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={v.contribution} onChange={(val) => updateInvestment(v.id, 'contribution', val)} width={90} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <RemoveButton onClick={() => removeInvestment(v.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
