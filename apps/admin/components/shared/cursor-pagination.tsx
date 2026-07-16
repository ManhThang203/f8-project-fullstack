'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';

type Props = {
  limit: number;
  onLimitChange: (limit: number) => void;
  hasMore: boolean;
  pageIndex: number;
  onPrev: () => void;
  onNext: () => void;
};

export function CursorPagination({
  limit,
  onLimitChange,
  hasMore,
  pageIndex,
  onPrev,
  onNext,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {/* Page Size Select */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>{t('pagination.show')}</span>
        <div className="w-[80px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                role="combobox"
                aria-expanded={open}
                className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 w-full justify-between px-3 font-normal"
              >
                <span>{limit}</span>
                <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[80px] p-1" align="center">
              <div className="flex flex-col gap-0.5">
                {[10, 20, 30, 50, 100, 500].map((size) => {
                  const isSelected = size === limit;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        onLimitChange(size);
                        setOpen(false);
                      }}
                      className={cn(
                        'hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-default select-none items-center justify-center rounded-sm py-1.5 text-sm outline-hidden transition-colors',
                        isSelected && 'bg-accent text-accent-foreground font-medium',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <span>{t('pagination.items')}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          variant="secondary"
          onClick={onPrev}
          disabled={pageIndex === 0}
          className="min-h-9 flex-1 justify-center gap-1 px-3 text-sm font-normal sm:flex-none"
        >
          <ChevronLeft className="size-4" />
          <span>{t('pagination.prev')}</span>
        </Button>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={!hasMore}
          className="min-h-9 flex-1 justify-center gap-1 px-3 text-sm font-normal sm:flex-none"
        >
          <span>{t('pagination.next')}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
