'use client';

import type { ButtonHTMLAttributes } from 'react';
import { useEffect, useState } from 'react';

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
  'bg-muted text-muted-foreground relative inline-flex shrink-0 grow-0 items-center justify-center overflow-hidden rounded-full p-0 font-semibold';

function AvatarInner({ src, name, username }: BaseProps) {
  const initial = getInitial(name, username);
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(src?.trim()) && !errored;

  useEffect(() => {
    setErrored(false);
  }, [src]);

  return showImage ? (
    <img
      src={src!}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setErrored(true)}
    />
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
      <span aria-hidden className={cn(baseClass, sizeClass, className)}>
        <AvatarInner src={src} name={name} username={username} />
      </span>
    );
  }

  const {
    label,
    onClick,
    disabled,
    src: _src,
    name: _name,
    username: _username,
    size: _size,
    as: _as,
    className: _className,
    ...rest
  } = props as ButtonProps;
  const ariaLabel = label ?? `Ảnh đại diện của ${name ?? username ?? 'người dùng'}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClass,
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        sizeClass,
        className,
      )}
      {...rest}
    >
      <AvatarInner src={src} name={name} username={username} />
    </button>
  );
}
