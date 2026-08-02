import { useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { fmt } from '../../lib/format';
import { Card } from '../ui/Card';

function Th({ children, right = false }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`text-[11px] uppercase text-muted px-2.5 py-1.5 border-b border-border ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

export function IncomePay() {
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const updatePerson = useFinanceStore((s) => s.updatePerson);

  const household = useMemo(() => computeHousehold(people, filingStatus, stateTaxRate), [people, filingStatus, stateTaxRate]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold m-0">Income &amp; Pay</h1>
        <p className="text-sm text-muted mt-1 mb-0">Gross vs. net pay by frequency, per partner.</p>
      </div>

      {household.peopleCalc.map((p) => (
        <Card key={p.id} className="p-6">
          <input
            value={p.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updatePerson(p.id, 'name', e.target.value)}
            className="text-base font-bold border-none bg-transparent pb-3 w-full"
            style={{ color: 'oklch(22% 0.01 60)' }}
          />
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted">Annual gross salary</label>
              <input
                type="number"
                value={p.salary}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updatePerson(p.id, 'salary', parseFloat(e.target.value) || 0)}
                className="w-[120px] border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted">Annual bonus</label>
              <input
                type="number"
                value={p.bonus}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updatePerson(p.id, 'bonus', parseFloat(e.target.value) || 0)}
                className="w-[100px] border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted">401(k) % of salary</label>
              <input
                type="number"
                step={0.5}
                value={p.contribution401kPct}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updatePerson(p.id, 'contribution401kPct', parseFloat(e.target.value) || 0)}
                className="w-[70px] border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted">Insurance / mo (pre-tax)</label>
              <input
                type="number"
                value={p.insuranceMonthly}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updatePerson(p.id, 'insuranceMonthly', parseFloat(e.target.value) || 0)}
                className="w-[90px] border border-inputborder rounded-md px-2 py-1.5 text-sm font-mono"
              />
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th />
                <Th right>Annual</Th>
                <Th right>Monthly</Th>
                <Th right>Biweekly</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5 px-2.5 text-sm border-b border-rowborder">Gross pay (incl. bonus)</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(p.grossWithBonus)}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(p.grossWithBonus / 12)}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono border-b border-rowborder">{fmt(p.grossWithBonus / 26)}</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm text-muted border-b border-rowborder">– 401(k) contribution</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono text-muted border-b border-rowborder">{fmt(p.contribution401kAnnual)}</td>
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm text-muted border-b border-rowborder">– Insurance premium (pre-tax)</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono text-muted border-b border-rowborder">{fmt(p.insuranceAnnual)}</td>
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm text-muted border-b border-rowborder">– Social Security (6.2%)</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono text-muted border-b border-rowborder">{fmt(p.ssTax)}</td>
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm text-muted border-b border-rowborder">– Medicare (1.45%)</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono text-muted border-b border-rowborder">{fmt(p.medicareTax)}</td>
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm text-muted border-b border-rowborder">– Federal + state tax (allocated share)</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono text-muted border-b border-rowborder">{fmt(p.allocTax)}</td>
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
                <td className="py-1.5 px-2.5 border-b border-rowborder" />
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-sm font-bold">Net take-home</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono font-bold">{fmt(p.netAnnual)}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono font-bold">{fmt(p.netAnnual / 12)}</td>
                <td className="py-1.5 px-2.5 text-sm text-right font-mono font-bold">{fmt(p.netAnnual / 26)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      ))}

      <div className="rounded-[10px] px-6 py-5 flex justify-between items-center flex-wrap gap-3" style={{ background: 'oklch(24% 0.02 50)', color: 'oklch(94% 0.012 75)' }}>
        <div className="text-sm font-semibold">Combined household net income</div>
        <div className="flex gap-7 font-mono text-[15px]">
          <div>{fmt(household.netAnnualHousehold)}/yr</div>
          <div>{fmt(household.netMonthlyHousehold)}/mo</div>
          <div>{fmt(household.netBiweeklyHousehold)}/2wk</div>
        </div>
      </div>
      <p className="text-xs text-subtle m-0">
        Federal + flat state tax are computed once on combined household income and allocated to each partner
        proportionally to their gross pay — actual paycheck withholding will differ.
      </p>
    </div>
  );
}
