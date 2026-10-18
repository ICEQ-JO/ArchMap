import { type HTMLAttributes, type ReactNode } from 'react';
import './Badge.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`} {...props}>
      {children}
    </span>
  );
}
