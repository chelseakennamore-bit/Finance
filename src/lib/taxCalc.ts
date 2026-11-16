import type { FilingStatus } from './types';

/** Social Security wage base for tax year 2027, per SSA's October 14, 2026 announcement. */
export const SS_WAGE_BASE_ESTIMATE = 192300;

/** 2027 federal marginal brackets per IRS Revenue Procedure 2026-35: [rate, cumulative income cap]. */
export const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [[0.10, 12800], [0.12, 52025], [0.22, 109125], [0.24, 208325], [0.32, 264550], [0.35, 661375], [0.37, Infinity]],
  mfj: [[0.10, 25600], [0.12, 104050], [0.22, 218250], [0.24, 416650], [0.32, 529100], [0.35, 793650], [0.37, Infinity]],
  hoh: [[0.10, 18250], [0.12, 69650], [0.22, 109100], [0.24, 208300], [0.32, 264550], [0.35, 661350], [0.37, Infinity]],
};

/** 2027 standard deduction per filing status, per IRS Revenue Procedure 2026-35. */
export const STD_DED: Record<FilingStatus, number> = { single: 16600, mfj: 33200, hoh: 24925 };

/** Additional Medicare (0.9%) applies above these thresholds. Fixed by statute since 2013 —
 * unlike brackets and the standard deduction, these are not inflation-indexed. */
export const ADDL_MED_THRESH: Record<FilingStatus, number> = { single: 200000, mfj: 250000, hoh: 200000 };

/** Bracket-walking marginal tax function — shared by real income and scenario projections. */
export function marginalTax(taxable: number, status: FilingStatus): number {
  const brackets = BRACKETS[status] || BRACKETS.single;
  let tax = 0;
  let prev = 0;
  for (const [rate, cap] of brackets) {
    const slice = Math.min(Math.max(taxable - prev, 0), cap - prev);
    tax += slice * rate;
    prev = cap;
    if (taxable <= cap) break;
  }
  return tax;
}

export function baseFica(wages: number, ssWageBase: number = SS_WAGE_BASE_ESTIMATE) {
  const ss = Math.min(wages, ssWageBase) * 0.062;
  const medicare = wages * 0.0145;
  return { ss, medicare, total: ss + medicare };
}

export function addlMedicare(totalWages: number, status: FilingStatus): number {
  const threshold = ADDL_MED_THRESH[status] || ADDL_MED_THRESH.single;
  return Math.max(0, totalWages - threshold) * 0.009;
}
