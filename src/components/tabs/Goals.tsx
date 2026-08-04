import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold, projectGoal } from '../../lib/derive';
import { fmt } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RemoveButton } from '../ui/EditableCell';

export function Goals() {
  const assets = useFinanceStore((s) => s.assets);
  const expenses = useFinanceStore((s) => s.expenses);
  const investments = useFinanceStore((s) => s.investments);
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const emergencyFundTargetMonths = useFinanceStore((s) => s.emergencyFundTargetMonths);
  const setEmergencyFundTargetMonths = useFinanceStore((s) => s.setEmergencyFundTargetMonths);
  const goals = useFinanceStore((s) => s.goals);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const removeGoal = useFinanceStore((s) => s.removeGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);

  const totalMonthlyExpenses = useMemo(() => expenses.reduce((sum, x) => sum + x.monthly, 0), [expenses]);
  const emergencyMonths = totalMonthlyExpenses ? assets.cash / totalMonthlyExpenses : 0;

  const household = useMemo(() => computeHousehold(people, filingStatus, stateTaxRate), [people, filingStatus, stateTaxRate]);
  const monthlySurplus = household.netMonthlyHousehold - totalMonthlyExpenses;

  const emergencyTargetAmount = emergencyFundTargetMonths * totalMonthlyExpenses;
  const emergencyMet = assets.cash >= emergencyTargetAmount;
  const emergencyProgressPct = emergencyTargetAmount > 0 ? Math.min(100, (assets.cash / emergencyTargetAmount) * 100) : 100;
  const emergencyShortfall = Math.max(0, emergencyTargetAmount - assets.cash);

  let emergencyTimeFmt: string;
  if (emergencyMet) {
    emergencyTimeFmt = 'Goal met';
  } else if (monthlySurplus <= 0) {
    emergencyTimeFmt = 'Not on pace';
  } else {
    const monthsToTarget = Math.ceil(emergencyShortfall / monthlySurplus);
    emergencyTimeFmt = monthsToTarget > 600 ? '600+ mo' : `${Math.floor(monthsToTarget / 12)}y ${monthsToTarget % 12}m`;
  }

  const totalInvestments = useMemo(() => investments.reduce((sum, v) => sum + v.balance, 0), [investments]);
  const totalMonthlyContribution = useMemo(() => investments.reduce((sum, v) => sum + v.contribution, 0), [investments]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold m-0">Goals</h1>
        <p className="text-sm text-muted mt-1 mb-0">Emergency fund coverage and savings-goal timelines.</p>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
          <div className="text-[13px] font-semibold">Emergency fund</div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Target</label>
            <input
              type="number"
              step={0.5}
              value={emergencyFundTargetMonths}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmergencyFundTargetMonths(parseClampedNumber(e.target.value))}
              className="w-[70px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
            />
            <span className="text-[13px] text-muted">months of expenses</span>
          </div>
        </div>

        <div className="flex gap-6 items-baseline flex-wrap mb-4">
          <div className="text-[28px] font-bold font-mono">{emergencyMonths.toFixed(1)} months</div>
          <div className="text-[13px] text-muted">
            of expenses covered by {fmt(assets.cash)} in cash, at {fmt(totalMonthlyExpenses)}/mo spend
          </div>
        </div>

        <div className="flex w-full h-3.5 rounded-full overflow-hidden mb-2" style={{ background: 'oklch(92% 0.008 70)' }}>
          <div
            className="h-3.5"
            style={{ width: `${emergencyProgressPct}%`, background: emergencyMet ? 'oklch(56% 0.09 145)' : 'oklch(58% 0.1 40)' }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-muted mb-4">
          <div>{fmt(assets.cash)} saved</div>
          <div>Target: {fmt(emergencyTargetAmount)}</div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <div className="text-xs uppercase text-muted">Progress</div>
            <div className="text-xl font-bold font-mono mt-1">{emergencyProgressPct.toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">{emergencyMet ? 'Above target' : 'Still needed'}</div>
            <div className="text-xl font-bold font-mono mt-1">
              {fmt(emergencyMet ? assets.cash - emergencyTargetAmount : emergencyShortfall)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted">Time to target</div>
            <div className="text-xl font-bold font-mono mt-1">{emergencyTimeFmt}</div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <div className="text-[13px] font-semibold">Savings goals</div>
        <Button variant="primary" onClick={addGoal}>
          + Add goal
        </Button>
      </div>

      {goals.length === 0 && (
        <Card className="p-6">
          <p className="text-[13px] text-subtle m-0">No goals yet — add one to start projecting a timeline.</p>
        </Card>
      )}

      {goals.map((goal) => {
        const projection = projectGoal(totalInvestments, totalMonthlyContribution, goal.targetAmount, goal.assumedReturnPct);
        const goalTimeFmt = projection.alreadyMet
          ? 'Already met'
          : projection.reached
            ? `${Math.floor(projection.months / 12)}y ${projection.months % 12}m`
            : '600+ mo';

        return (
          <Card key={goal.id} className="p-6">
            <div className="flex justify-between items-start mb-4 gap-3">
              <input
                value={goal.label}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateGoal(goal.id, 'label', e.target.value)}
                onBlur={(e) => {
                  if (!e.target.value.trim()) updateGoal(goal.id, 'label', 'Untitled goal');
                }}
                className="text-[13px] font-semibold border border-transparent bg-transparent px-1 py-0.5 -mx-1 focus:border-inputborder focus:rounded-md flex-1 min-w-0"
              />
              <RemoveButton onClick={() => removeGoal(goal.id)} />
            </div>
            <div className="flex gap-5 flex-wrap mb-4.5">
              <div>
                <label className="text-xs text-muted block mb-1.5">Target amount</label>
                <input
                  type="number"
                  value={goal.targetAmount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateGoal(goal.id, 'targetAmount', parseClampedNumber(e.target.value))}
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateGoal(goal.id, 'assumedReturnPct', parseClampedNumber(e.target.value))}
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
        );
      })}
    </div>
  );
}
