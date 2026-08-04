import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { exportCSV, importCSV } from '../../lib/csv';
import { fmt, fmtSigned } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberCell, RemoveButton, TextCell } from '../ui/EditableCell';
import type { Expense, MonthlyActual } from '../../lib/types';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function ActualsSpendTrend({ history }: { history: MonthlyActual[] }) {
  if (history.length < 2) return null;
  const totals = [...history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ month: m.month, total: m.entries.reduce((sum, e) => sum + e.amount, 0) }));
  const max = Math.max(...totals.map((t) => t.total), 1);
  return (
    <Card className="p-6">
      <div className="text-[13px] font-semibold mb-4">Actual spend trend</div>
      <div className="flex items-end gap-2 h-[160px]">
        {totals.map((t) => {
          const heightPct = Math.max(4, (t.total / max) * 100);
          return (
            <div key={t.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0">
              <div className="text-[10px] font-mono text-muted whitespace-nowrap">{fmt(t.total)}</div>
              <div className="w-full rounded-t-sm" style={{ height: `${heightPct}%`, background: 'oklch(58% 0.1 40)' }} />
              <div className="text-[10px] text-subtle mt-1 whitespace-nowrap">{monthLabel(t.month)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function BudgetExpenses() {
  const expenses = useFinanceStore((s) => s.expenses);
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const removeExpense = useFinanceStore((s) => s.removeExpense);
  const setExpenses = useFinanceStore((s) => s.setExpenses);
  const monthlyActuals = useFinanceStore((s) => s.monthlyActuals);
  const saveMonthlyActual = useFinanceStore((s) => s.saveMonthlyActual);
  const removeMonthlyActual = useFinanceStore((s) => s.removeMonthlyActual);

  const household = useMemo(() => computeHousehold(people, filingStatus, stateTaxRate), [people, filingStatus, stateTaxRate]);
  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, x) => sum + x.monthly, 0), [expenses]);
  const totalAnnualExpenses = totalMonthlyExpenses * 12;

  const [actualsMonth, setActualsMonth] = useState(currentMonth());
  const [draftActuals, setDraftActuals] = useState<Record<string, number>>({});

  useEffect(() => {
    const existing = monthlyActuals.find((m) => m.month === actualsMonth);
    const draft: Record<string, number> = {};
    for (const x of expenses) {
      const found = existing?.entries.find((e) => e.category === x.category);
      draft[x.category] = found ? found.amount : 0;
    }
    setDraftActuals(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualsMonth, expenses.length]);

  const totalActual = useMemo(
    () => expenses.reduce((sum, x) => sum + (draftActuals[x.category] ?? 0), 0),
    [expenses, draftActuals]
  );

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importCSV<Expense>(
      file,
      [
        { key: 'category', label: 'Category' },
        { key: 'monthly', label: 'Monthly', numeric: true },
      ],
      (rows) => setExpenses(rows)
    );
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold m-0">Budget &amp; Expenses</h1>
          <p className="text-sm text-muted mt-1 mb-0">Editable monthly expense categories.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              exportCSV('expenses.csv', expenses, [
                { key: 'category', label: 'Category' },
                { key: 'monthly', label: 'Monthly' },
              ])
            }
          >
            Export CSV
          </Button>
          <Button
            onClick={() =>
              exportCSV(
                'expenses-template.csv',
                [
                  { id: 0, category: 'Rent', monthly: 2000 },
                  { id: 0, category: 'Groceries', monthly: 600 },
                ],
                [
                  { key: 'category', label: 'Category' },
                  { key: 'monthly', label: 'Monthly' },
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
          <Button variant="primary" onClick={addExpense}>
            + Add category
          </Button>
        </div>
      </div>

      <Card className="px-4 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase text-muted p-2.5">Category</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Monthly</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Annual</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">% of net</th>
              <th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id}>
                <td className="p-1.5 px-2.5 border-b border-rowborder">
                  <TextCell value={x.category} onChange={(v) => updateExpense(x.id, 'category', v)} fallback="Uncategorized" />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={x.monthly} onChange={(v) => updateExpense(x.id, 'monthly', v)} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right font-mono text-sm">{fmt(x.monthly * 12)}</td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right font-mono text-sm text-muted">
                  {(household.netMonthlyHousehold ? (x.monthly / household.netMonthlyHousehold) * 100 : 0).toFixed(1)}%
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <RemoveButton onClick={() => removeExpense(x.id)} />
                </td>
              </tr>
            ))}
            <tr>
              <td className="p-2.5 font-bold text-sm">Total</td>
              <td className="p-2.5 font-bold text-right font-mono text-sm">{fmt(totalMonthlyExpenses)}</td>
              <td className="p-2.5 font-bold text-right font-mono text-sm">{fmt(totalAnnualExpenses)}</td>
              <td className="p-2.5" />
              <td className="p-2.5" />
            </tr>
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="text-[13px] font-semibold">Monthly actuals</div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={actualsMonth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setActualsMonth(e.target.value)}
              className="border border-inputborder rounded-md px-2.5 py-1.5 text-sm"
            />
            <Button
              variant="primary"
              onClick={() =>
                saveMonthlyActual(
                  actualsMonth,
                  expenses.map((x) => ({ category: x.category, amount: draftActuals[x.category] ?? 0 }))
                )
              }
            >
              Save month
            </Button>
          </div>
        </div>
        {expenses.length === 0 ? (
          <p className="text-[13px] text-subtle m-0">Add expense categories above to start tracking actuals against them.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted p-2.5">Category</th>
                <th className="text-right text-[11px] uppercase text-muted p-2.5">Budgeted</th>
                <th className="text-right text-[11px] uppercase text-muted p-2.5">Actual</th>
                <th className="text-right text-[11px] uppercase text-muted p-2.5">Variance</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => {
                const actual = draftActuals[x.category] ?? 0;
                const variance = x.monthly - actual;
                return (
                  <tr key={x.id}>
                    <td className="p-1.5 px-2.5 border-b border-rowborder text-sm">{x.category}</td>
                    <td className="p-1.5 px-2.5 border-b border-rowborder text-right font-mono text-sm text-muted">{fmt(x.monthly)}</td>
                    <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                      <input
                        type="number"
                        value={actual}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setDraftActuals((d) => ({ ...d, [x.category]: parseClampedNumber(e.target.value) }))
                        }
                        className="w-[100px] text-right border border-inputborder rounded-md px-2 py-1 text-sm font-mono"
                      />
                    </td>
                    <td className={`p-1.5 px-2.5 border-b border-rowborder text-right font-mono text-sm ${variance >= 0 ? 'text-positive-text' : 'text-negative'}`}>
                      {fmtSigned(variance)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="p-2.5 font-bold text-sm">Total</td>
                <td className="p-2.5 font-bold text-right font-mono text-sm">{fmt(totalMonthlyExpenses)}</td>
                <td className="p-2.5 font-bold text-right font-mono text-sm">{fmt(totalActual)}</td>
                <td
                  className={`p-2.5 font-bold text-right font-mono text-sm ${
                    totalMonthlyExpenses - totalActual >= 0 ? 'text-positive-text' : 'text-negative'
                  }`}
                >
                  {fmtSigned(totalMonthlyExpenses - totalActual)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>

      <ActualsSpendTrend history={monthlyActuals} />

      {monthlyActuals.length > 0 && (
        <Card className="p-6">
          <div className="text-[13px] font-semibold mb-3.5">Logged months</div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted py-2 px-2.5">Month</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Actual spend</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">vs. budget</th>
                <th className="py-2 px-2.5" />
              </tr>
            </thead>
            <tbody>
              {[...monthlyActuals]
                .sort((a, b) => b.month.localeCompare(a.month))
                .map((m) => {
                  const total = m.entries.reduce((sum, e) => sum + e.amount, 0);
                  const variance = totalMonthlyExpenses - total;
                  return (
                    <tr key={m.id}>
                      <td className="py-1.5 px-2.5 text-sm border-b border-rowborder">{monthLabel(m.month)}</td>
                      <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(total)}</td>
                      <td className={`py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder ${variance >= 0 ? 'text-positive-text' : 'text-negative'}`}>
                        {fmtSigned(variance)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border-b border-rowborder">
                        <RemoveButton onClick={() => removeMonthlyActual(m.id)} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
