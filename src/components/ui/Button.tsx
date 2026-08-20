import type { PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary';

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled = false,
}: PropsWithChildren<{ onClick?: () => void; variant?: Variant; type?: 'button' | 'submit'; disabled?: boolean }>) {
  const base = 'px-4 py-2 rounded-md text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? `${base} border-none bg-accent text-white font-semibold hover:bg-accent-hover`
      : `${base} border border-inputborder bg-tile text-tile-text`;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}
