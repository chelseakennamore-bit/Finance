import type { FilingStatus } from './types';

/**
 * Alabama individual income tax — Alabama Code § 40-18-15 (personal exemption + standard
 * deduction) and the Alabama Department of Revenue's published bracket rates. Alabama's
 * brackets tax married-filing-jointly at double the single/HOH thresholds; MFS uses the
 * single thresholds. Verified against revenue.alabama.gov and the codified statute.
 *
 * Note: Alabama HB389 (2025 regular session) raises the MFJ standard deduction from $8,500
 * to $9,500 (with similar increases proposed for other statuses) for tax years beginning
 * after 12/31/2025 — the exact enacted single/HOH figures weren't confirmable at the time
 * this was written, so the pre-HB389 codified amounts below are used. Re-verify each fall
 * alongside the federal figures.
 */

/** [rate, cumulative taxable-income cap], same bracket-walking shape as federal BRACKETS. */
export const AL_BRACKETS: Record<FilingStatus, [number, number][]> = {
  single: [[0.02, 500], [0.04, 3000], [0.05, Infinity]],
  hoh: [[0.02, 500], [0.04, 3000], [0.05, Infinity]],
  mfj: [[0.02, 1000], [0.04, 6000], [0.05, Infinity]],
};

export const AL_PERSONAL_EXEMPTION: Record<FilingStatus, number> = {
  single: 1500,
  hoh: 3000,
  mfj: 3000,
};

interface AlStdDedRule {
  /** Deduction amount when AGI is at or below fullAtOrBelow. */
  max: number;
  fullAtOrBelow: number;
  /** Reduction applied per each $500 (or part thereof) of AGI above fullAtOrBelow. */
  reductionPer500: number;
  /** Deduction never drops below this amount, regardless of AGI. */
  floor: number;
}

export const AL_STD_DED: Record<FilingStatus, AlStdDedRule> = {
  single: { max: 3000, fullAtOrBelow: 20000, reductionPer500: 25, floor: 2500 },
  hoh: { max: 4700, fullAtOrBelow: 23000, reductionPer500: 135, floor: 2000 },
  mfj: { max: 8500, fullAtOrBelow: 23000, reductionPer500: 175, floor: 5000 },
};

export function alStandardDeduction(agi: number, filingStatus: FilingStatus): number {
  const rule = AL_STD_DED[filingStatus];
  if (agi <= rule.fullAtOrBelow) return rule.max;
  const stepsOver = Math.ceil((agi - rule.fullAtOrBelow) / 500);
  return Math.max(rule.floor, rule.max - stepsOver * rule.reductionPer500);
}

export function alMarginalTax(taxable: number, filingStatus: FilingStatus): number {
  const brackets = AL_BRACKETS[filingStatus] || AL_BRACKETS.single;
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

export interface AlTaxResult {
  standardDeduction: number;
  personalExemption: number;
  taxableIncome: number;
  tax: number;
}

/** Alabama generally conforms to the federal wage basis (401(k)/pre-tax insurance reduce
 * Alabama taxable wages the same way they reduce federal wages), so this takes the same
 * "fedWages" basis already computed for the federal calculation as its AGI proxy. */
export function computeAlabamaTax(fedWagesTotal: number, filingStatus: FilingStatus): AlTaxResult {
  const agi = Math.max(0, fedWagesTotal);
  const standardDeduction = alStandardDeduction(agi, filingStatus);
  const personalExemption = AL_PERSONAL_EXEMPTION[filingStatus];
  const taxableIncome = Math.max(0, agi - standardDeduction - personalExemption);
  const tax = alMarginalTax(taxableIncome, filingStatus);
  return { standardDeduction, personalExemption, taxableIncome, tax };
}
