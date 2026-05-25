'use client';

/**
 * IconButton — nút icon 44×44 px dùng chung.
 * `iconButtonClass()` cho phép Link / summary reuse style mà không cần render <button>.
 */

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type IconButtonShape = 'circle' | 'square';
export type IconButtonTone = 'muted' | 'inverted';
export type IconButtonSize = 'sm' | 'md';

type IconButtonClassOpts = {
  shape?: IconButtonShape;
  tone?: IconButtonTone;
  size?: IconButtonSize;
};

/** Trả về chuỗi class cho icon button (dùng được cho cả <button>, <Link>, <summary>). */
export function iconButtonClass({ shape = 'circle', tone = 'muted', size = 'md' }: IconButtonClassOpts = {}) {
  return cn(
    'flex shrink-0 items-center justify-center transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    size === 'md' ? 'min-h-11 min-w-11' : 'min-h-9 min-w-9',
    shape === 'circle' ? 'rounded-full' : 'rounded-lg',
    tone === 'muted'
      ? 'text-muted-foreground hover:bg-muted'
      : 'text-white hover:bg-white/10',
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & IconButtonClassOpts;

/** Button icon 44×44 px với shape/tone/size preset. */
export function IconButton({ shape, tone, size, className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(iconButtonClass({ shape, tone, size }), className)}
      {...props}
    />
  );
}
