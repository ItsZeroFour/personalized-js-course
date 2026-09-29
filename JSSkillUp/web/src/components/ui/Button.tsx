import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'border border-line bg-panel text-fg hover:bg-panel-2',
  ghost: 'text-muted hover:bg-panel-2 hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className)} {...props} />;
}

interface ButtonLinkProps {
  to: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function ButtonLink({ to, children, variant = 'primary', size = 'md', className }: ButtonLinkProps) {
  return (
    <Link to={to} className={cn(BASE, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}>
      {children}
    </Link>
  );
}
