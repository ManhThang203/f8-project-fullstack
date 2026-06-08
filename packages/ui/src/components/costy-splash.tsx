import { CotsyLogo } from './cotsy-logo';
import { cn } from '../utils/cn';

type CostySplashProps = {
  className?: string;
};

/** Costy splash: black canvas + centered logo with shared `costy-pulse` animation. */
export function CostySplash({ className }: CostySplashProps) {
  return (
    <div
      className={cn('flex min-h-screen w-screen items-center justify-center bg-black px-6', className)}
    >
      <CotsyLogo className="animate-costy-pulse motion-reduce:animate-none will-change-transform" />
    </div>
  );
}
