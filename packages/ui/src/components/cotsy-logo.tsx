import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../utils/cn';

type CotsyLogoProps = Omit<ComponentPropsWithoutRef<typeof Image>, 'src' | 'alt' | 'width' | 'height'>;

/** Cotsy app logo — `/icon/Logo-app-2.webp`. */
export function CotsyLogo({ className, ...props }: CotsyLogoProps) {
  return (
    <Image
      src="/icon/Logo-app-2.webp"
      alt="Cotsy"
      width={96}
      height={96}
      priority
      unoptimized
      className={cn('h-24 w-24 shrink-0 object-contain', className)}
      {...props}
    />
  );
}
