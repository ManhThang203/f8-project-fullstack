import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../utils/cn';

type CotsyLogoProps = Omit<
  ComponentPropsWithoutRef<typeof Image>,
  'src' | 'alt' | 'width' | 'height'
>;

/** Cotsy app logo — `/icon/Logo-app-2.webp`. */
export function CotsyLogo({ className, ...props }: CotsyLogoProps) {
  return (
    <Image
      src="/icon/Logo-app-2.webp"
      alt="Cotsy"
      width={150}
      height={150}
      priority
      unoptimized
      className={cn('h-[150px] w-[150px] shrink-0 object-contain', className)}
      {...props}
    />
  );
}
