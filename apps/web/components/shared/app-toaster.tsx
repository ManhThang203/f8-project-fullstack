'use client';

import { Toaster } from 'sonner';

const toastOptions = {
  classNames: {
    toast: 'border-border bg-card text-foreground rounded-xl border shadow-lg',
    title: 'text-foreground',
    description: 'text-muted-foreground',
    actionButton: 'bg-primary text-primary-foreground',
    cancelButton: 'bg-muted text-muted-foreground',
    closeButton: 'border-border bg-card text-muted-foreground hover:text-foreground',
  },
};

export function AppToaster() {
  return (
    <Toaster
      richColors
      position="bottom-center"
      closeButton
      toastOptions={toastOptions}
    />
  );
}
