import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeScenario } from '../../lib/derive';
import { fmt, fmtSigned } from '../../lib/format';
import { parseClampedNumber } from '../../lib/validate';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RemoveButton, TextCell } from '../ui/EditableCell';
import type { Scenario } from '../../lib/types';

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center mt-2.5">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseClampedNumber(e.target.value))}
        className="w-[120px] text-right border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
      />
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
  const savedScenarios = useFinanceStore((s) => s.savedScenarios);
  const updateScenario = useFinanceStore((s) => s.updateScenario);
  const resetScenario = useFinanceStore((s) => s.resetScenario);
  const saveScenarioSnapshot = useFinanceStore((s) => s.saveScenarioSnapshot);
  const updateSavedScenarioLabel = useFinanceStore((s) => s.updateSavedScenarioLabel);
  const removeSavedScenario = useFinanceStore((s) => s.removeSavedScenario);

  const scenOut = useMemo(() => computeScenario(scenario), [scenario]);
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
          <Button variant="primary" onClick={saveScenarioSnapshot}>
            Save scenario
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <SliderField
          label="Partner A salary"
          value={scenario.salaryA}
          min={0}
          max={300000}
          step={1000}
          unitLabel="Annual"
          onChange={(v) => set('salaryA', v)}
          extra={<NumberField label="Annual bonus" value={scenario.bonusA} onChange={(v) => set('bonusA', v)} />}
        />
        <SliderField
          label="Partner B salary"
          value={scenario.salaryB}
          min={0}
          max={300000}
          step={1000}
          unitLabel="Annual"
          onChange={(v) => set('salaryB', v)}
          extra={<NumberField label="Annual bonus" value={scenario.bonusB} onChange={(v) => set('bonusB', v)} />}
        />
        <SliderField label="Mortgage / rent" value={scenario.mortgage} min={0} max={8000} step={50} unitLabel="Per month" onChange={(v) => set('mortgage', v)} />
        <SliderField label="All other expenses" value={scenario.otherExpenses} min={0} max={10000} step={50} unitLabel="Per month" onChange={(v) => set('otherExpenses', v)} />
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
              <td className="p-2 px-2.5 text-[15px] font-bold">Net cash flow</td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowAnnual)}
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowMonthly)}
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-[15px] font-bold" style={{ color: scenColor }}>
                {fmtSigned(scenOut.cashFlowBiweekly)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="rounded-[10px] px-6 py-5 text-[15px] font-semibold" style={{ background: 'oklch(24% 0.02 50)', color: 'oklch(94% 0.012 75)' }}>
        {scenVerdict}
      </div>

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
