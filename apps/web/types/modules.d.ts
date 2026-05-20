/** Ambient types when IDE has not resolved workspace node_modules yet. */
declare module 'sonner' {
  import type { ReactNode } from 'react';

  export interface ToasterProps {
    richColors?: boolean;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    closeButton?: boolean;
  }

  export function Toaster(props?: ToasterProps): ReactNode;

  export const toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    message: (message: string) => void;
  };
}
