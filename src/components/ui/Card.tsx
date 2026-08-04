import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren, CSSProperties } from 'react';

export function Card({ children, className = '', style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div className="relative">
      <div ref={scrollRef} className={`bg-card border border-border rounded-[10px] overflow-x-auto ${className}`} style={style}>
        {children}
      </div>
      {canScrollLeft && (
        <div
          className="pointer-events-none absolute left-px top-px bottom-px w-4 rounded-l-[9px]"
          style={{ boxShadow: 'inset 14px 0 12px -12px oklch(20% 0.01 60 / 25%)' }}
        />
      )}
      {canScrollRight && (
        <div
          className="pointer-events-none absolute right-px top-px bottom-px w-4 rounded-r-[9px]"
          style={{ boxShadow: 'inset -14px 0 12px -12px oklch(20% 0.01 60 / 25%)' }}
        />
      )}
    </div>
  );
}
