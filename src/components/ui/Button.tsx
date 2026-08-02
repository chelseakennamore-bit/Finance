import type { PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary';

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
}: PropsWithChildren<{ onClick?: () => void; variant?: Variant; type?: 'button' | 'submit' }>) {
  const base = 'px-4 py-2 rounded-md text-[13px] cursor-pointer';
  const styles =
    variant === 'primary'
      ? `${base} border-none bg-accent text-white font-semibold hover:bg-accent-hover`
      : `${base} border border-inputborder bg-tile text-tile-text`;
  return (
    <button type={type} onClick={onClick} className={styles}>
      {children}
    </button>
  );
}
