'use client';

import type { PostVisibilityDto } from '@costy/shared';
import { Globe, Lock, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const VISIBILITY_OPTIONS: {
  value: PostVisibilityDto;
  label: string;
  Icon: typeof Globe;
}[] = [
  { value: 'PUBLIC', label: 'Công khai', Icon: Globe },
  { value: 'FRIENDS', label: 'Bạn bè', Icon: Users },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', Icon: Lock },
];

type Props = {
  value: PostVisibilityDto;
  onChange: (value: PostVisibilityDto) => void;
  disabled?: boolean;
};

export function VisibilitySelect({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Quyền riêng tư bài viết"
      className="flex flex-wrap gap-2"
    >
      {VISIBILITY_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.Icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'border-border flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium',
              'transition-colors duration-150',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-40',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
