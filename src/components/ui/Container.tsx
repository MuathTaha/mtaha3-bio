import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type Measure = 'narrow' | 'prose' | 'wide';

const measures: Record<Measure, string> = {
  narrow: 'max-w-[var(--measure-narrow)]',
  prose:  'max-w-[var(--measure-prose)]',
  wide:   'max-w-[var(--measure-wide)]',
};

export function Container({
  children,
  measure = 'prose',
  className,
}: {
  children: ReactNode;
  measure?: Measure;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full px-6 sm:px-8', measures[measure], className)}>
      {children}
    </div>
  );
}
