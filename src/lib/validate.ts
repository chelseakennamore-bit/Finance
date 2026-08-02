/** Clamps a numeric input to zero or greater — used for all balances, rates, and amounts,
 * since negative values don't make sense anywhere in this app and usually indicate a typo. */
export function clampNonNegative(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function parseClampedNumber(raw: string): number {
  return clampNonNegative(parseFloat(raw) || 0);
}
