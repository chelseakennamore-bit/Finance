import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { exportCSV, importCSV } from '../../lib/csv';
import { fmt } from '../../lib/format';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberCell, RemoveButton, TextCell } from '../ui/EditableCell';
import type { Expense } from '../../lib/types';

export function BudgetExpenses() {
  const expenses = useFinanceStore((s) => s.expenses);
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const removeExpense = useFinanceStore((s) => s.removeExpense);
  const setExpenses = useFinanceStore((s) => s.setExpenses);

  const household = useMemo(() => computeHousehold(people, filingStatus, stateTaxRate), [people, filingStatus, stateTaxRate]);
  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, x) => sum + x.monthly, 0), [expenses]);
  const totalAnnualExpenses = totalMonthlyExpenses * 12;

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
                  <TextCell value={x.category} onChange={(v) => updateExpense(x.id, 'category', v)} />
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
    </div>
  );
}
