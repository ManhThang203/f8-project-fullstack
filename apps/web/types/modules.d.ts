/** Ambient types when IDE has not resolved workspace node_modules yet. */
declare module 'sonner' {
  import type { ReactNode } from 'react';

  export interface ToastAction {
    label: ReactNode;
    onClick: () => void;
  }

  export interface ToastOptions {
    action?: ToastAction;
    duration?: number;
  }

  export interface ToasterProps {
    richColors?: boolean;
    position?:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right';
    closeButton?: boolean;
  }

  export function Toaster(props?: ToasterProps): ReactNode;

  export const toast: {
    (message: string, options?: ToastOptions): void;
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    message: (message: string, options?: ToastOptions) => void;
  };
}
