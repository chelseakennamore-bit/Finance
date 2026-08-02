import type { Debt, DebtStrategy } from './types';

export interface PayoffOrderEntry {
  name: string;
  months: number;
}

export interface PayoffResult {
  months: number;
  totalInterest: number;
  order: PayoffOrderEntry[];
}

/** Amortization simulator for avalanche (highest APR first) / snowball (smallest balance first). */
export function simulatePayoff(debts: Debt[], strategy: DebtStrategy, extraPayment: number): PayoffResult {
  if (!debts.length) return { months: 0, totalInterest: 0, order: [] };

  const working = debts.map((d) => ({ ...d, remaining: d.balance }));
  working.sort((a, b) => (strategy === 'avalanche' ? b.apr - a.apr : a.remaining - b.remaining));

  let months = 0;
  let totalInterest = 0;
  const payoffMonths: Record<number, number> = {};
  const cap = 600;

  while (working.some((d) => d.remaining > 0.01) && months < cap) {
    months++;
    for (const d of working) {
      if (d.remaining <= 0) continue;
      const interest = d.remaining * (d.apr / 100 / 12);
      totalInterest += interest;
      d.remaining += interest;
      const payment = Math.min(d.remaining, d.minPayment);
      d.remaining -= payment;
    }
    let extra = extraPayment;
    for (const d of working) {
      if (extra <= 0) break;
      if (d.remaining <= 0) continue;
      const pay = Math.min(d.remaining, extra);
      d.remaining -= pay;
      extra -= pay;
    }
    for (const d of working) {
      if (d.remaining <= 0 && !(d.id in payoffMonths)) payoffMonths[d.id] = months;
    }
  }

  const order = working.map((d) => ({ name: d.name, months: payoffMonths[d.id] ?? months }));
  return { months, totalInterest, order };
}
