import type { PropsWithChildren, CSSProperties } from 'react';

export function Card({ children, className = '', style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  return (
    <div className={`bg-card border border-border rounded-[10px] overflow-x-auto ${className}`} style={style}>
      {children}
    </div>
  );
}
