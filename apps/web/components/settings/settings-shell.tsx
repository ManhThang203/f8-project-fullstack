import type { ReactNode } from 'react';

import { SettingsNav } from '@/components/settings/settings-nav';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Layout chung cho các trang con trong /settings. */
export function SettingsShell({ title, description, children }: Props) {
  return (
    <main className="bg-background min-h-dvh py-4">
      <div className="mx-auto w-full max-w-5xl px-4">
        <header className="mb-6">
          <h1 className="text-foreground text-xl font-semibold">Cài đặt</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Quản lý tài khoản, bảo mật và trải nghiệm của bạn.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="lg:w-56 lg:shrink-0">
            <SettingsNav />
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-foreground text-lg font-semibold">{title}</h2>
              {description ? (
                <p className="text-muted-foreground mt-1 text-sm text-pretty">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
