'use client';

import type { PostVisibilityDto } from '@costy/shared';
import { ChevronDown, Globe, Lock, Users } from 'lucide-react';

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
  const selected = VISIBILITY_OPTIONS.find((option) => option.value === value) ?? VISIBILITY_OPTIONS[0]!;
  const SelectedIcon = selected.Icon;

  return (
    <div className="relative">
      <SelectedIcon
        className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <select
        value={value}
        disabled={disabled}
        aria-label="Quyền riêng tư bài viết"
        onChange={(event) => onChange(event.target.value as PostVisibilityDto)}
        className={cn(
          'border-border bg-muted/50 text-foreground min-h-11 w-full appearance-none rounded-xl border py-2 pl-9 pr-9 text-sm',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
