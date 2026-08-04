import type { FilingStatus } from './types';

/** Social Security wage base for tax year 2026, per SSA's October 2025 announcement. */
export const SS_WAGE_BASE_ESTIMATE = 184500;

/** 2026 federal marginal brackets per IRS Revenue Procedure 2025-32: [rate, cumulative income cap]. */
export const BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [[0.10, 12400], [0.12, 50400], [0.22, 105700], [0.24, 201775], [0.32, 256225], [0.35, 640600], [0.37, Infinity]],
  mfj: [[0.10, 24800], [0.12, 100800], [0.22, 211400], [0.24, 403550], [0.32, 512450], [0.35, 768700], [0.37, Infinity]],
  hoh: [[0.10, 17700], [0.12, 67450], [0.22, 105700], [0.24, 201750], [0.32, 256200], [0.35, 640600], [0.37, Infinity]],
};

/** 2026 standard deduction per filing status, per IRS Revenue Procedure 2025-32. */
export const STD_DED: Record<FilingStatus, number> = { single: 16100, mfj: 32200, hoh: 24150 };

/** Additional Medicare (0.9%) applies above these thresholds. */
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
