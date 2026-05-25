'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type BaseProps = {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: Size;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'name'> & {
    as?: 'button';
    label?: string;
  };

type SpanProps = BaseProps & {
  as: 'span';
  className?: string;
};

type Props = ButtonProps | SpanProps;

const sizeClasses: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
  '2xl': 'h-[5.5rem] w-[5.5rem] text-2xl md:h-24 md:w-24',
};

function getInitial(name?: string | null, username?: string | null) {
  const source = name?.trim() || username?.trim() || '?';
  return source.slice(0, 1).toUpperCase();
}

const baseClass =
  'bg-muted text-muted-foreground inline-flex shrink-0 self-start items-center justify-center overflow-hidden rounded-full p-0 font-semibold aspect-square';

function AvatarInner({ src, name, username, size = 'md' }: BaseProps) {
  const initial = getInitial(name, username);
  return src ? (
    <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center">{initial}</span>
  );
}

/**
 * Avatar — hiển thị ảnh đại diện hoặc initial.
 * `as='button'` (default): dùng khi click được (mở lightbox, v.v.).
 * `as='span'`:  dùng khi chỉ hiển thị, không interactive (bên trong summary/Link).
 */
export function Avatar(props: Props) {
  const { src, name, username, size = 'md', as: asProp = 'button', className } = props;
  const sizeClass = sizeClasses[size];

  if (asProp === 'span') {
    return (
      <span
        aria-hidden
        className={cn(baseClass, sizeClass, className)}
      >
        <AvatarInner src={src} name={name} username={username} size={size} />
      </span>
    );
  }

  const { label, ...rest } = props as ButtonProps;
  const ariaLabel = label ?? `Ảnh đại diện của ${name ?? username ?? 'người dùng'}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        baseClass,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        sizeClass,
        className,
      )}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <AvatarInner src={src} name={name} username={username} size={size} />
    </button>
  );
}
