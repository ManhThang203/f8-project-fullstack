import { CotsyLogo } from './cotsy-logo';
import { MetaWordmark } from './meta-wordmark';
import { cn } from '../utils/cn';

type CostySplashProps = {
  className?: string;
};

/**
 * Costy-style splash: solid black canvas + centered logo + bottom “from Meta” strip
 */
export function CostySplash({ className }: CostySplashProps) {
  return (
    <div className={cn('flex min-h-screen w-screen flex-col bg-black text-white', className)}>
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <CotsyLogo className="animate-pulse" />
      </div>
      <footer className="flex flex-col items-center gap-1 px-6 pb-8 pt-2">
        <p className="text-xs font-normal text-gray-400">from</p>
        <MetaWordmark className="h-4 w-auto max-w-40 shrink-0 text-white" />
      </footer>
    </div>
  );
}
