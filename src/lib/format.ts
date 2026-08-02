export function fmt(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return '$' + Math.round(v).toLocaleString('en-US');
}

export function fmtSigned(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return (v < 0 ? '-$' : '+$') + Math.abs(v).toLocaleString('en-US');
}

export function fmtPct(n: number, digits = 1): string {
  return (Number.isFinite(n) ? n : 0).toFixed(digits);
}
