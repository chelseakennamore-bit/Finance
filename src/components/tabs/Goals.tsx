import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { projectGoal } from '../../lib/derive';
import { fmt } from '../../lib/format';
import { Card } from '../ui/Card';

export function Goals() {
  const assets = useFinanceStore((s) => s.assets);
  const expenses = useFinanceStore((s) => s.expenses);
  const investments = useFinanceStore((s) => s.investments);
  const goal = useFinanceStore((s) => s.goal);
  const setGoalTarget = useFinanceStore((s) => s.setGoalTarget);
  const setGoalReturn = useFinanceStore((s) => s.setGoalReturn);

  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, x) => sum + x.monthly, 0), [expenses]);
  const emergencyMonths = totalMonthlyExpenses ? assets.cash / totalMonthlyExpenses : 0;

  const totalInvestments = useMemo(() => investments.reduce((sum, v) => sum + v.balance, 0), [investments]);
  const totalMonthlyContribution = useMemo(() => investments.reduce((sum, v) => sum + v.contribution, 0), [investments]);

  const projection = useMemo(
    () => projectGoal(totalInvestments, totalMonthlyContribution, goal.targetAmount, goal.assumedReturnPct),
    [totalInvestments, totalMonthlyContribution, goal.targetAmount, goal.assumedReturnPct]
  );
  const goalTimeFmt = projection.alreadyMet
    ? 'Already met'
    : projection.reached
      ? `${Math.floor(projection.months / 12)}y ${projection.months % 12}m`
      : '600+ mo';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold m-0">Goals</h1>
        <p className="text-sm text-muted mt-1 mb-0">Emergency fund coverage and a savings-goal timeline.</p>
      </div>

      <Card className="p-6">
        <div className="text-[13px] font-semibold mb-3">Emergency fund</div>
        <div className="flex gap-6 items-baseline flex-wrap">
          <div className="text-[28px] font-bold font-mono">{emergencyMonths.toFixed(1)} months</div>
          <div className="text-[13px] text-muted">
            of expenses covered by {fmt(assets.cash)} in cash, at {fmt(totalMonthlyExpenses)}/mo spend
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-[13px] font-semibold mb-4">Savings goal</div>
        <div className="flex gap-5 flex-wrap mb-4.5">
          <div>
            <label className="text-xs text-muted block mb-1.5">Target amount</label>
            <input
              type="number"
              value={goal.targetAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGoalTarget(parseFloat(e.target.value) || 0)}
              className="w-[140px] border border-inputborder rounded-md px-2.5 py-[7px] text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Assumed annual return</label>
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                step={0.5}
                value={goal.assumedReturnPct}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setGoalReturn(parseFloat(e.target.value) || 0)}
                className="w-[100px] border border-inputborder rounded-md px-2.5 py-[7px] text-sm font-mono"
              />
              <span className="text-[13px]">%</span>
            </span>
          </div>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <div className="text-xs uppercase text-muted">Current investments</div>
            <div className="text-xl font-bold font-mono mt-1">{fmt(totalInvestments)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Contributing / mo</div>
            <div className="text-xl font-bold font-mono mt-1">{fmt(totalMonthlyContribution)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Time to goal</div>
            <div className="text-xl font-bold font-mono mt-1">{goalTimeFmt}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
