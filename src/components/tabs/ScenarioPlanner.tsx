import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeScenario, effectiveScenarioBonus } from '../../lib/derive';
import { fmt, fmtSigned } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RemoveButton, TextCell } from '../ui/EditableCell';
import type { BonusMode, Scenario } from '../../lib/types';

type View = 'simple' | 'itemized';

function BonusField({
  salary,
  flat,
  mode,
  pct,
  onModeChange,
  onFlatChange,
  onPctChange,
}: {
  salary: number;
  flat: number;
  mode?: BonusMode;
  pct?: number;
  onModeChange: (mode: BonusMode) => void;
  onFlatChange: (v: number) => void;
  onPctChange: (v: number) => void;
}) {
  const isPercent = (mode || 'flat') === 'percent';
  return (
    <div className="flex justify-between items-center mt-2.5">
      <span className="text-xs text-muted">Annual bonus</span>
      <div className="flex items-center gap-1.5">
        <select
          value={mode || 'flat'}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onModeChange(e.target.value as BonusMode)}
          className="border border-inputborder rounded-md px-1.5 py-1.5 text-sm"
        >
          <option value="flat">$</option>
          <option value="percent">%</option>
        </select>
        {isPercent ? (
          <>
            <input
              type="number"
              step={0.5}
              value={pct || 0}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPctChange(parseClampedNumber(e.target.value))}
              className="w-[70px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
            />
            <span className="text-xs text-muted font-mono">= {fmt(effectiveScenarioBonus(salary, flat, mode, pct))}</span>
          </>
        ) : (
          <input
            type="number"
            value={flat}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onFlatChange(parseClampedNumber(e.target.value))}
            className="w-[120px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
          />
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unitLabel,
  onChange,
  extra,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unitLabel: string;
  onChange: (v: number) => void;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="p-[22px]">
      <div className="text-[13px] font-semibold mb-3.5">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseClampedNumber(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted">{unitLabel}</span>
        <input
          type="number"
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseClampedNumber(e.target.value))}
          className="w-[120px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
        />
      </div>
      {extra}
    </Card>
  );
}

export function ScenarioPlanner() {
  const scenario = useFinanceStore((s) => s.scenario);
  const expenses = useFinanceStore((s) => s.expenses);
  const savedScenarios = useFinanceStore((s) => s.savedScenarios);
  const updateScenario = useFinanceStore((s) => s.updateScenario);
  const updateScenarioExpenseOverride = useFinanceStore((s) => s.updateScenarioExpenseOverride);
  const resetScenarioExpenseOverrides = useFinanceStore((s) => s.resetScenarioExpenseOverrides);
  const resetScenario = useFinanceStore((s) => s.resetScenario);
  const saveScenarioSnapshot = useFinanceStore((s) => s.saveScenarioSnapshot);
  const updateSavedScenarioLabel = useFinanceStore((s) => s.updateSavedScenarioLabel);
  const removeSavedScenario = useFinanceStore((s) => s.removeSavedScenario);

  const [view, setView] = useState<View>('simple');

  const itemizedTotal = useMemo(
    () => expenses.reduce((sum, x) => sum + (scenario.expenseOverrides?.[x.id] ?? x.monthly), 0),
    [expenses, scenario.expenseOverrides]
  );
  const itemizedOverridden = Object.keys(scenario.expenseOverrides || {}).length > 0;

  const scenOut = useMemo(
    () => computeScenario(scenario, view === 'itemized' ? itemizedTotal : undefined),
    [scenario, view, itemizedTotal]
  );
  const scenColor = scenOut.cashFlowMonthly >= 0 ? 'oklch(46% 0.1 145)' : 'oklch(50% 0.16 25)';
  const scenVerdict =
    scenOut.cashFlowMonthly >= 0
      ? `Affordable — projected surplus of ${fmt(scenOut.cashFlowMonthly)}/mo`
      : `Not affordable at this budget — projected shortfall of ${fmt(Math.abs(scenOut.cashFlowMonthly))}/mo`;

  const set = <K extends keyof Scenario>(field: K, val: Scenario[K]) => updateScenario(field, val);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold m-0">Scenario Planner</h1>
          <p className="text-sm text-muted mt-1 mb-0">Try different salaries and expenses to see what's affordable.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetScenario}>Reset to current numbers</Button>
          <Button variant="primary" onClick={() => saveScenarioSnapshot(view === 'itemized' ? itemizedTotal : undefined)}>
            Save scenario
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={view === 'simple' ? 'primary' : undefined} onClick={() => setView('simple')}>
          Simple
        </Button>
        <Button variant={view === 'itemized' ? 'primary' : undefined} onClick={() => setView('itemized')}>
          Against current expenses
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SliderField
          label="Partner A salary"
          value={scenario.salaryA}
          min={0}
          max={300000}
          step={1000}
          unitLabel="Annual"
          onChange={(v) => set('salaryA', v)}
          extra={
            <BonusField
              salary={scenario.salaryA}
              flat={scenario.bonusA}
              mode={scenario.bonusModeA}
              pct={scenario.bonusPctA}
              onModeChange={(v) => set('bonusModeA', v)}
              onFlatChange={(v) => set('bonusA', v)}
              onPctChange={(v) => set('bonusPctA', v)}
            />
          }
        />
        <SliderField
          label="Partner B salary"
          value={scenario.salaryB}
          min={0}
          max={300000}
          step={1000}
          unitLabel="Annual"
          onChange={(v) => set('salaryB', v)}
          extra={
            <BonusField
              salary={scenario.salaryB}
              flat={scenario.bonusB}
              mode={scenario.bonusModeB}
              pct={scenario.bonusPctB}
              onModeChange={(v) => set('bonusModeB', v)}
              onFlatChange={(v) => set('bonusB', v)}
              onPctChange={(v) => set('bonusPctB', v)}
            />
          }
        />
        {view === 'simple' ? (
          <>
            <SliderField label="Mortgage / rent" value={scenario.mortgage} min={0} max={8000} step={50} unitLabel="Per month" onChange={(v) => set('mortgage', v)} />
            <SliderField label="All other expenses" value={scenario.otherExpenses} min={0} max={10000} step={50} unitLabel="Per month" onChange={(v) => set('otherExpenses', v)} />
          </>
        ) : null}
        <SliderField
          label="401(k) contribution (% of salary, both partners)"
          value={scenario.pretax401kPct}
          min={0}
          max={30}
          step={0.5}
          unitLabel="% of each salary"
          onChange={(v) => set('pretax401kPct', v)}
        />
        <SliderField
          label="Insurance premiums (combined, pre-tax)"
          value={scenario.insuranceMonthly}
          min={0}
          max={2000}
          step={25}
          unitLabel="Per month, both partners"
          onChange={(v) => set('insuranceMonthly', v)}
        />
      </div>

      {view === 'itemized' && (
        <Card className="px-4 py-2">
          <div className="flex justify-between items-center pt-3.5 pb-1.5 px-2.5">
            <div className="text-[13px] font-semibold">Current expenses, adjusted for this scenario</div>
            {itemizedOverridden && (
              <button
                onClick={resetScenarioExpenseOverrides}
                className="text-xs text-muted bg-transparent border-none cursor-pointer p-0 underline"
              >
                Reset to current amounts
              </button>
            )}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted p-2.5">Category</th>
                <th className="text-right text-[11px] uppercase text-muted p-2.5">Current / mo</th>
                <th className="text-right text-[11px] uppercase text-muted p-2.5">Scenario / mo</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => {
                const overridden = scenario.expenseOverrides?.[x.id] !== undefined;
                return (
                  <tr key={x.id}>
                    <td className="p-2 px-2.5 text-sm border-b border-rowborder">{x.category}</td>
                    <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(x.monthly)}</td>
                    <td className="p-2 px-2.5 text-right border-b border-rowborder">
                      <input
                        type="number"
                        value={scenario.expenseOverrides?.[x.id] ?? x.monthly}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          updateScenarioExpenseOverride(x.id, parseClampedNumber(e.target.value))
                        }
                        className={`w-[110px] text-right border rounded-md px-2 py-1 text-sm font-mono ${
                          overridden ? 'border-accent' : 'border-inputborder'
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="p-2 px-2.5 text-sm font-bold">Total</td>
                <td className="p-2 px-2.5 text-right font-mono text-sm font-bold text-muted">
                  {fmt(expenses.reduce((sum, x) => sum + x.monthly, 0))}
                </td>
                <td className="p-2 px-2.5 text-right font-mono text-sm font-bold">{fmt(itemizedTotal)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      <Card className="px-4 py-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] uppercase text-muted p-2.5" />
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Annual</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Monthly</th>
              <th className="text-right text-[11px] uppercase text-muted p-2.5">Biweekly</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 px-2.5 text-sm border-b border-rowborder">Combined gross income</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(scenOut.grossTotal)}</td>
              <td className="p-2 px-2.5 border-b border-rowborder" />
              <td className="p-2 px-2.5 border-b border-rowborder" />
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm text-muted border-b border-rowborder">– 401(k) + insurance (pre-tax)</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.pretaxTotal)}</td>
              <td className="p-2 px-2.5 border-b border-rowborder" />
              <td className="p-2 px-2.5 border-b border-rowborder" />
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm text-muted border-b border-rowborder">– Federal tax</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.fedTax)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.fedTax / 12)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.fedTax / 26)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm text-muted border-b border-rowborder">– State tax</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.stateTax)}</td>
              <td className="p-2 px-2.5 border-b border-rowborder" />
              <td className="p-2 px-2.5 border-b border-rowborder" />
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm text-muted border-b border-rowborder">– FICA</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.totalFica)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.totalFica / 12)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.totalFica / 26)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm font-bold border-b border-rowborder">Net income</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold border-b border-rowborder">{fmt(scenOut.netAnnual)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold border-b border-rowborder">{fmt(scenOut.netMonthly)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold border-b border-rowborder">{fmt(scenOut.netBiweekly)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm text-muted border-b border-rowborder">– Total expenses (mortgage + other)</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.expensesAnnual)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.expensesMonthly)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(scenOut.expensesBiweekly)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-[15px] font-bold border-b border-rowborder">Net cash flow (before bonus)</td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold border-b border-rowborder" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowAnnualBeforeBonus)}
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold border-b border-rowborder" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowMonthly)}
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold border-b border-rowborder" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowBiweekly)}
              </td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-[15px] font-bold">Net cash flow (after bonus)</td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowAnnual)}
              </td>
              <td className="p-2 px-2.5 text-right text-sm text-subtle" colSpan={2}>
                same as above — bonus is annual-only
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="rounded-[10px] px-6 py-5 text-[15px] font-semibold" style={{ background: 'oklch(24% 0.02 50)', color: 'oklch(94% 0.012 75)' }}>
        {scenVerdict}
      </div>
      <p className="text-xs text-subtle m-0">
        Bonus is treated as a once-a-year payment: Monthly and Biweekly figures reflect recurring salary only, and
        "Net cash flow" is split into before/after bonus so you can see its one-time impact on the year.
      </p>

      {savedScenarios.length > 0 && (
        <Card className="px-4 py-2">
          <div className="text-[13px] font-semibold pt-3.5 pb-1.5 px-2.5">Saved scenarios</div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase text-muted py-2 px-2.5">Name</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Combined gross</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Net / mo</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Expenses / mo</th>
                <th className="text-right text-[11px] uppercase text-muted py-2 px-2.5">Cash flow / mo</th>
                <th className="py-2 px-2.5" />
              </tr>
            </thead>
            <tbody>
              {savedScenarios.map((sv) => {
                const out = computeScenario(sv);
                const color = out.cashFlowMonthly >= 0 ? 'oklch(46% 0.1 145)' : 'oklch(50% 0.16 25)';
                return (
                  <tr key={sv.id}>
                    <td className="p-1.5 px-2.5 border-b border-rowborder">
                      <TextCell value={sv.label} onChange={(v) => updateSavedScenarioLabel(sv.id, v)} fallback="Untitled scenario" />
                    </td>
                    <td className="p-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(out.grossTotal)}</td>
                    <td className="p-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(out.netMonthly)}</td>
                    <td className="p-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(out.expensesMonthly)}</td>
                    <td className="p-1.5 px-2.5 text-sm text-right font-mono font-bold border-b border-rowborder" style={{ color }}>
                      {fmtSigned(out.cashFlowMonthly)}
                    </td>
                    <td className="p-1.5 px-2.5 text-right border-b border-rowborder">
                      <RemoveButton onClick={() => removeSavedScenario(sv.id)} />
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
