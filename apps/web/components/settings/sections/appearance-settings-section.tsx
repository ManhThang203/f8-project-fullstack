'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { settingsSecondaryButtonClass } from '@/components/settings/settings-input-class';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/shared/ui';
import { cn } from '@/lib/utils';

const THEMES = [
  { id: 'light', label: 'Sáng', icon: Sun },
  { id: 'dark', label: 'Tối', icon: Moon },
  { id: 'system', label: 'Hệ thống', icon: Monitor },
] as const;

/** Chọn giao diện sáng / tối / theo hệ thống. */
export function AppearanceSettingsSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SettingsSection
      title="Chế độ hiển thị"
      description="Chọn giao diện sáng, tối hoặc theo thiết lập hệ thống."
    >
      {!mounted ? (
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(({ id, label, icon: Icon }) => {
            const active = theme === id;
            return (
              <Button
                key={id}
                type="button"
                variant={active ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setTheme(id)}
                aria-pressed={active}
                className={cn('justify-start', !active && settingsSecondaryButtonClass)}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Button>
            );
          })}
        </div>
      )}
      {mounted ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Đang áp dụng: {resolvedTheme === 'dark' ? 'Tối' : 'Sáng'}
        </p>
      ) : null}
    </SettingsSection>
  );
}
