import { useMemo } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { computeHousehold } from '../../lib/derive';
import { ADDL_MED_THRESH } from '../../lib/taxCalc';
import { fmt, fmtPct } from '../../lib/format';
import { Card } from '../ui/Card';

export function Taxes() {
  const people = useFinanceStore((s) => s.people);
  const filingStatus = useFinanceStore((s) => s.filingStatus);
  const stateTaxRate = useFinanceStore((s) => s.stateTaxRate);
  const taxState = useFinanceStore((s) => s.taxState);

  const household = useMemo(
    () => computeHousehold(people, filingStatus, stateTaxRate, taxState),
    [people, filingStatus, stateTaxRate, taxState]
  );
  const addlMedThresholdFmt = fmt(ADDL_MED_THRESH[filingStatus]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold m-0">Taxes</h1>
        <p className="text-sm text-muted mt-1 mb-0">
          2026 federal brackets + FICA + {taxState === 'AL' ? 'Alabama' : 'flat state'} rate, based on your filing
          status.
        </p>
      </div>

      <Card className="px-4 py-2">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="p-2.5 text-sm">Combined gross income</td>
              <td className="p-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.totalGrossAnnual)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-sm text-muted">– 401(k) + pre-tax insurance</td>
              <td className="p-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">{fmt(household.totalPretaxDeductions)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-sm text-muted">– Standard deduction ({filingStatus})</td>
              <td className="p-2.5 text-right font-mono text-sm text-muted border-b border-border">{fmt(household.stdDeduction)}</td>
            </tr>
            <tr>
              <td className="p-2.5 text-sm font-bold">Taxable income</td>
              <td className="p-2.5 text-right font-mono text-sm font-bold border-b border-border">{fmt(household.taxableIncome)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {household.alBreakdown && (
        <Card className="px-4 py-2">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="p-2.5 text-sm">Alabama AGI (federal wages basis)</td>
                <td className="p-2.5 text-right font-mono text-sm border-b border-rowborder">
                  {fmt(household.totalGrossAnnual - household.totalPretaxDeductions)}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 text-sm text-muted">– Alabama standard deduction ({filingStatus})</td>
                <td className="p-2.5 text-right font-mono text-sm text-muted border-b border-rowborder">
                  {fmt(household.alBreakdown.standardDeduction)}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 text-sm text-muted">– Alabama personal exemption ({filingStatus})</td>
                <td className="p-2.5 text-right font-mono text-sm text-muted border-b border-border">
                  {fmt(household.alBreakdown.personalExemption)}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 text-sm font-bold">Alabama taxable income</td>
                <td className="p-2.5 text-right font-mono text-sm font-bold border-b border-border">
                  {fmt(household.alBreakdown.taxableIncome)}
                </td>
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
              <td className="p-2 px-2.5 text-sm border-b border-rowborder">Federal income tax (effective {fmtPct(household.effectiveRate)}%)</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.federalTaxAnnual)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.federalTaxAnnual / 12)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.federalTaxAnnual / 26)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm border-b border-rowborder">
                State tax {taxState === 'AL' ? '(Alabama)' : `(flat ${stateTaxRate}%)`}
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.stateTaxAnnual)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.stateTaxAnnual / 12)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.stateTaxAnnual / 26)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm border-b border-rowborder">
                FICA (Social Security + Medicare, incl. additional Medicare {fmt(household.addlMed)})
              </td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.totalFicaAnnual)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.totalFicaAnnual / 12)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm border-b border-rowborder">{fmt(household.totalFicaAnnual / 26)}</td>
            </tr>
            <tr>
              <td className="p-2 px-2.5 text-sm font-bold">Net income</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold">{fmt(household.netAnnualHousehold)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold">{fmt(household.netMonthlyHousehold)}</td>
              <td className="p-2 px-2.5 text-right font-mono text-sm font-bold">{fmt(household.netBiweeklyHousehold)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-subtle m-0">
        Uses confirmed 2026 IRS brackets, standard deductions, and Social Security wage base (Revenue Procedure
        2025-32).{' '}
        {taxState === 'AL'
          ? "Alabama tax uses real brackets, standard deduction (with its income-based phase-out), and personal exemption per Alabama Code § 40-18-15 — a 2025 law (HB389) may raise the standard deduction further starting this tax year, pending confirmation of final enacted amounts."
          : 'State tax is a simplified flat rate, not real bracket math.'}{' '}
        Excludes credits. Additional Medicare threshold for {filingStatus}: {addlMedThresholdFmt}.
      </p>
    </div>
  );
}
