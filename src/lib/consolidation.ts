import type { Debt } from './types';

export interface ConsolidationResult {
  totalBalance: number;
  weightedCurrentApr: number;
  currentMinPayments: number;
  newMonthlyPayment: number;
  newTotalInterest: number;
  newTotalPaid: number;
}

/** Models rolling a chosen set of existing debts into one new amortizing loan
 * at the given APR and term, using the standard fixed-payment formula. */
export function computeConsolidation(debts: Debt[], apr: number, termMonths: number): ConsolidationResult {
  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0);
  const weightedCurrentApr = totalBalance ? debts.reduce((sum, d) => sum + d.balance * d.apr, 0) / totalBalance : 0;
  const currentMinPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);

  const r = apr / 100 / 12;
  let newMonthlyPayment = 0;
  if (totalBalance > 0 && termMonths > 0) {
    newMonthlyPayment =
      r === 0 ? totalBalance / termMonths : (totalBalance * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  }
  const newTotalPaid = newMonthlyPayment * termMonths;
  const newTotalInterest = Math.max(0, newTotalPaid - totalBalance);

  return { totalBalance, weightedCurrentApr, currentMinPayments, newMonthlyPayment, newTotalInterest, newTotalPaid };
}
