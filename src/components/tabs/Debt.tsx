import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { simulatePayoff } from '../../lib/payoff';
import { computeConsolidation } from '../../lib/consolidation';
import { exportCSV, importCSV } from '../../lib/csv';
import { fmt, fmtPct } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberCell, RemoveButton, TextCell } from '../ui/EditableCell';
import { StatTile } from '../ui/StatTile';
import type { Debt as DebtType, DebtStrategy } from '../../lib/types';

export function Debt() {
  const debts = useFinanceStore((s) => s.debts);
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const taxState = useFinanceStore((s) => s.taxState);
  const debtStrategy = useFinanceStore((s) => s.debtStrategy);
  const debtExtraPayment = useFinanceStore((s) => s.debtExtraPayment);
  const consolidationApr = useFinanceStore((s) => s.consolidationApr);
  const consolidationTermMonths = useFinanceStore((s) => s.consolidationTermMonths);
  const setDebtStrategy = useFinanceStore((s) => s.setDebtStrategy);
  const setDebtExtraPayment = useFinanceStore((s) => s.setDebtExtraPayment);
  const setDebtConsolidation = useFinanceStore((s) => s.setDebtConsolidation);
  const setConsolidationApr = useFinanceStore((s) => s.setConsolidationApr);
  const setConsolidationTermMonths = useFinanceStore((s) => s.setConsolidationTermMonths);
  const updateDebt = useFinanceStore((s) => s.updateDebt);
  const addDebt = useFinanceStore((s) => s.addDebt);
  const removeDebt = useFinanceStore((s) => s.removeDebt);
  const setDebts = useFinanceStore((s) => s.setDebts);

  const household = useMemo(
    () => computeHousehold(people, filingStatus, stateTaxRate, taxState),
    [people, filingStatus, stateTaxRate, taxState]
  );
  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalMinPayments = useMemo(() => debts.reduce((sum, d) => sum + d.minPayment, 0), [debts]);
  const weightedApr = totalDebt ? debts.reduce((sum, d) => sum + d.balance * d.apr, 0) / totalDebt : 0;
  const dti = household.netMonthlyHousehold ? (totalMinPayments / household.netMonthlyHousehold) * 100 : 0;

  const payoffDebts = useMemo(() => debts.filter((d) => d.includeInPayoff !== false), [debts]);
  const payoff = useMemo(
    () => simulatePayoff(payoffDebts, debtStrategy, debtExtraPayment),
    [payoffDebts, debtStrategy, debtExtraPayment]
  );

  const consolidationDebts = useMemo(() => debts.filter((d) => d.includeInConsolidation === true), [debts]);
  const consolidation = useMemo(
    () => computeConsolidation(consolidationDebts, consolidationApr, consolidationTermMonths),
    [consolidationDebts, consolidationApr, consolidationTermMonths]
  );
  const monthlyPaymentChange = consolidation.newMonthlyPayment - consolidation.currentMinPayments;

  // "Without consolidating": restore consolidated debts to individual payoff, same as if the
  // consolidation checkboxes had never been touched.
  const withoutConsolidatingDebts = useMemo(
    () => debts.filter((d) => d.includeInPayoff !== false || d.includeInConsolidation === true),
    [debts]
  );
  const withoutConsolidatingPayoff = useMemo(
    () => simulatePayoff(withoutConsolidatingDebts, debtStrategy, debtExtraPayment),
    [withoutConsolidatingDebts, debtStrategy, debtExtraPayment]
  );

  // "With consolidation": the already-synced payoff plan (which excludes rolled-in debts) plus
  // one synthetic debt standing in for the new consolidation loan.
  const withConsolidationPayoff = useMemo(() => {
    if (consolidationDebts.length === 0) return payoff;
    const syntheticLoan = {
      id: -1,
      name: 'Consolidated loan',
      balance: consolidation.totalBalance,
      apr: consolidationApr,
      minPayment: consolidation.newMonthlyPayment,
    };
    return simulatePayoff([...payoffDebts, syntheticLoan], debtStrategy, debtExtraPayment);
  }, [payoffDebts, consolidationDebts.length, consolidation, consolidationApr, debtStrategy, debtExtraPayment, payoff]);

  const interestSaved = withoutConsolidatingPayoff.totalInterest - withConsolidationPayoff.totalInterest;

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importCSV<DebtType>(
      file,
      [
        { key: 'name', label: 'Name' },
        { key: 'balance', label: 'Balance', numeric: true },
        { key: 'apr', label: 'APR', numeric: true },
        { key: 'minPayment', label: 'MinPayment', numeric: true },
      ],
      (rows) => setDebts(rows)
    );
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold m-0">Debt</h1>
          <p className="text-sm text-muted mt-1 mb-0">Balances, rates, minimum payments, and a payoff plan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              exportCSV('debts.csv', debts, [
                { key: 'name', label: 'Name' },
                { key: 'balance', label: 'Balance' },
                { key: 'apr', label: 'APR' },
                { key: 'minPayment', label: 'MinPayment' },
              ])
            }
          >
            Export CSV
          </Button>
          <Button
            onClick={() =>
              exportCSV(
                'debts-template.csv',
                [
                  { id: 0, name: 'Credit Card', balance: 5000, apr: 22.9, minPayment: 150 },
                  { id: 0, name: 'Car Loan', balance: 15000, apr: 6.5, minPayment: 350 },
                ],
                [
                  { key: 'name', label: 'Name' },
                  { key: 'balance', label: 'Balance' },
                  { key: 'apr', label: 'APR' },
                  { key: 'minPayment', label: 'MinPayment' },
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
          <Button variant="primary" onClick={addDebt}>
            + Add debt
          </Button>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <StatTile label="Total debt" value={fmt(totalDebt)} />
        <StatTile label="Min payments / mo" value={fmt(totalMinPayments)} />
        <StatTile label="Weighted avg APR" value={`${fmtPct(weightedApr, 2)}%`} />
        <StatTile label="Debt-to-income" value={`${fmtPct(dti, 1)}%`} />
      </div>

      <Card className="px-4 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-center text-[11px] uppercase text-muted p-2.5">Payoff</th>
              <th className="text-left text-[11px] uppercase text-muted p-2.5">Debt</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Balance</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">APR</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Min payment</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Annual interest</th>
              <th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.id}>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-center">
                  <input
                    type="checkbox"
                    checked={d.includeInPayoff !== false}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateDebt(d.id, 'includeInPayoff', e.target.checked)}
                    title="Include this debt in the payoff planner"
                  />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder">
                  <TextCell value={d.name} onChange={(v) => updateDebt(d.id, 'name', v)} fallback="Unnamed debt" />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={d.balance} onChange={(v) => updateDebt(d.id, 'balance', v)} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={d.apr} onChange={(v) => updateDebt(d.id, 'apr', v)} width={70} step={0.01} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <NumberCell value={d.minPayment} onChange={(v) => updateDebt(d.id, 'minPayment', v)} width={90} />
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right font-mono text-sm text-muted">
                  {fmt((d.balance * d.apr) / 100)}
                </td>
                <td className="p-1.5 px-2.5 border-b border-rowborder text-right">
                  <RemoveButton onClick={() => removeDebt(d.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="text-[13px] font-semibold">Payoff planner</div>
          <div className="text-xs text-muted">
            {payoffDebts.length} of {debts.length} debts included
          </div>
        </div>
        <div className="flex gap-6 flex-wrap mb-4.5">
          <div>
            <label className="text-xs text-muted block mb-1.5">Strategy</label>
            <select
              value={debtStrategy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setDebtStrategy(e.target.value as DebtStrategy)}
              className="px-2.5 py-[7px] rounded-md border border-inputborder text-sm"
            >
              <option value="avalanche">Avalanche (highest APR first)</option>
              <option value="snowball">Snowball (smallest balance first)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Extra payment / mo</label>
            <input
              type="number"
              value={debtExtraPayment}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDebtExtraPayment(parseClampedNumber(e.target.value))}
              className="w-[120px] border border-inputborder rounded-md px-2.5 py-[7px] text-sm font-mono"
            />
          </div>
        </div>
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <div className="text-xs uppercase text-muted">Debt-free in</div>
            <div className="text-xl font-bold font-mono mt-1">{payoff.months} mo</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Total interest paid</div>
            <div className="text-xl font-bold font-mono mt-1">{fmt(payoff.totalInterest)}</div>
          </div>
        </div>
        {payoff.order.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted py-2 px-2.5">Payoff order</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Paid off in</th>
              </tr>
            </thead>
            <tbody>
              {payoff.order.map((o, i) => (
                <tr key={i}>
                  <td className="py-1.5 px-2.5 text-sm border-b border-rowborder">{o.name}</td>
                  <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{o.months} mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[13px] text-subtle m-0">No debts are checked for the payoff plan — check "Payoff" on a debt above to include it.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="text-[13px] font-semibold mb-1">Debt consolidation</div>
        <p className="text-xs text-muted mt-0 mb-3.5">
          Check the debts you'd roll into one new loan to see the combined balance and what a new fixed payment
          would look like.
        </p>
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr>
              <th className="text-center text-[11px] uppercase text-muted py-2 px-2.5">Roll in</th>
              <th className="text-left text-[11px] uppercase text-muted py-2 px-2.5">Debt</th>
              <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Balance</th>
              <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Current APR</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.id}>
                <td className="py-1.5 px-2.5 text-center border-b border-rowborder">
                  <input
                    type="checkbox"
                    checked={d.includeInConsolidation === true}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDebtConsolidation(d.id, e.target.checked)}
                    title="Roll this debt into the consolidation loan (removes it from the individual payoff plan)"
                  />
                </td>
                <td className="py-1.5 px-2.5 text-sm border-b border-rowborder">{d.name}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(d.balance)}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmtPct(d.apr, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {consolidationDebts.length === 0 ? (
          <p className="text-[13px] text-subtle m-0">Check debts above to see the numbers for a new consolidation loan.</p>
        ) : (
          <>
            <div className="flex gap-6 flex-wrap mb-4.5">
              <div>
                <label className="text-xs text-muted block mb-1.5">New loan APR</label>
                <input
                  type="number"
                  step={0.01}
                  value={consolidationApr}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConsolidationApr(parseClampedNumber(e.target.value))}
                  className="w-[120px] border border-inputborder rounded-md px-2.5 py-[7px] text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1.5">New loan term (months)</label>
                <input
                  type="number"
                  value={consolidationTermMonths}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConsolidationTermMonths(parseClampedNumber(e.target.value))}
                  className="w-[120px] border border-inputborder rounded-md px-2.5 py-[7px] text-sm font-mono"
                />
              </div>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div>
                <div className="text-xs uppercase text-muted">Balance to consolidate</div>
                <div className="text-xl font-bold font-mono mt-1">{fmt(consolidation.totalBalance)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Current weighted APR</div>
                <div className="text-xl font-bold font-mono mt-1">{fmtPct(consolidation.weightedCurrentApr, 2)}%</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Current combined min payment</div>
                <div className="text-xl font-bold font-mono mt-1">{fmt(consolidation.currentMinPayments)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">New monthly payment</div>
                <div className="text-xl font-bold font-mono mt-1">{fmt(consolidation.newMonthlyPayment)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">New total interest</div>
                <div className="text-xl font-bold font-mono mt-1">{fmt(consolidation.newTotalInterest)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Monthly payment change</div>
                <div
                  className="text-xl font-bold font-mono mt-1"
                  style={{ color: monthlyPaymentChange <= 0 ? 'oklch(46% 0.1 145)' : 'oklch(50% 0.16 25)' }}
                >
                  {monthlyPaymentChange <= 0 ? '-' : '+'}
                  {fmt(Math.abs(monthlyPaymentChange))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border">
              <div className="text-[13px] font-semibold mb-3.5">
                Payoff plan: without vs. with consolidating
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs uppercase text-muted mb-2">Without consolidating</div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-[11px] uppercase text-muted">Debt-free in</div>
                      <div className="text-lg font-bold font-mono mt-0.5">{withoutConsolidatingPayoff.months} mo</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-muted">Total interest</div>
                      <div className="text-lg font-bold font-mono mt-0.5">{fmt(withoutConsolidatingPayoff.totalInterest)}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted mb-2">With consolidating</div>
                  <div className="flex gap-6">
                    <div>
                      <div className="text-[11px] uppercase text-muted">Debt-free in</div>
                      <div className="text-lg font-bold font-mono mt-0.5">{withConsolidationPayoff.months} mo</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-muted">Total interest</div>
                      <div className="text-lg font-bold font-mono mt-0.5">{fmt(withConsolidationPayoff.totalInterest)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Interest saved by consolidating</div>
                <div
                  className="text-xl font-bold font-mono mt-1"
                  style={{ color: interestSaved >= 0 ? 'oklch(46% 0.1 145)' : 'oklch(50% 0.16 25)' }}
                >
                  {interestSaved >= 0 ? '+' : '-'}
                  {fmt(Math.abs(interestSaved))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
