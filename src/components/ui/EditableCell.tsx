import type { ChangeEvent, FocusEvent } from 'react';
import { parseClampedNumber } from '../../lib/validate';

export function TextCell({
  value,
  onChange,
  weight,
  fallback,
}: {
  value: string;
  onChange: (v: string) => void;
  weight?: string;
  /** If set, an empty value is replaced with this on blur instead of being left blank. */
  fallback?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      onBlur={(e: FocusEvent<HTMLInputElement>) => {
        if (fallback && !e.target.value.trim()) onChange(fallback);
      }}
      style={{ fontWeight: weight }}
      className="w-full border border-transparent bg-transparent px-1.5 py-1 text-sm focus:border-inputborder focus:rounded-md focus:px-1.5"
    />
  );
}

export function NumberCell({
  value,
  onChange,
  width = 110,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  width?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseClampedNumber(e.target.value))}
      style={{ width }}
      className="text-right border border-inputborder rounded-md px-2 py-[5px] text-sm font-mono"
    />
  );
}

export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-negative text-xs cursor-pointer bg-transparent border-none">
      Remove
    </button>
  );
}
