import { useMemo } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { fmt, fmtSigned } from '../../lib/format';
import { StatTile } from '../ui/StatTile';
import { Card } from '../ui/Card';

export function Overview() {
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const expenses = useFinanceStore((s) => s.expenses);
  const debts = useFinanceStore((s) => s.debts);
  const investments = useFinanceStore((s) => s.investments);
  const assets = useFinanceStore((s) => s.assets);

  const household = useMemo(() => computeHousehold(people, filingStatus, stateTaxRate), [people, filingStatus, stateTaxRate]);
  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, x) => sum + x.monthly, 0), [expenses]);
  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.balance, 0), [debts]);
  const totalInvestments = useMemo(() => investments.reduce((sum, v) => sum + v.balance, 0), [investments]);
  const totalAssets = assets.cash + assets.homeValue + assets.vehicles + assets.other + totalInvestments;
  const netWorth = totalAssets - totalDebt;

  const monthlySurplus = household.netMonthlyHousehold - totalMonthlyExpenses;
  const cashFlowColor = monthlySurplus >= 0 ? 'oklch(46% 0.1 145)' : 'oklch(50% 0.16 25)';
  const pctExpensesBar = household.netMonthlyHousehold ? Math.min(100, (totalMonthlyExpenses / household.netMonthlyHousehold) * 100) : 0;
  const pctLeftoverBar = Math.max(0, 100 - pctExpensesBar);
  const emergencyMonths = totalMonthlyExpenses ? assets.cash / totalMonthlyExpenses : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold m-0">Overview</h1>
        <p className="text-sm text-muted mt-1 mb-0">Combined household snapshot, today.</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatTile label="Net Worth" value={fmt(netWorth)} big />
        <StatTile label="Net Income / mo" value={fmt(household.netMonthlyHousehold)} big />
        <StatTile label="Expenses / mo" value={fmt(totalMonthlyExpenses)} big />
        <StatTile label="Cash Flow / mo" value={fmtSigned(monthlySurplus)} color={cashFlowColor} big />
        <StatTile label="Total Debt" value={fmt(totalDebt)} big />
        <StatTile label="Investments" value={fmt(totalInvestments)} big />
        <StatTile label="Emergency fund" value={`${emergencyMonths.toFixed(1)} mo`} big />
      </div>

      <Card className="p-6">
        <div className="text-[13px] font-semibold mb-3">Monthly cash flow allocation</div>
        <div className="flex w-full h-3.5 rounded-full overflow-hidden" style={{ background: 'oklch(92% 0.008 70)' }}>
          <div className="h-3.5" style={{ background: 'oklch(58% 0.1 40)', width: `${pctExpensesBar}%` }} />
          <div className="h-3.5" style={{ background: 'oklch(56% 0.09 145)', width: `${pctLeftoverBar}%` }} />
        </div>
        <div className="flex gap-6 mt-2.5 text-xs font-mono text-muted">
          <div>Expenses: {pctExpensesBar.toFixed(0)}%</div>
          <div>Remaining: {pctLeftoverBar.toFixed(0)}%</div>
        </div>
      </Card>
    </div>
  );
}
