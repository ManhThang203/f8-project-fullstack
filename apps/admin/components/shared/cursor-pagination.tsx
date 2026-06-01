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
    <div className="flex items-center justify-between gap-4 py-4 px-1">
      {/* Page Size Select */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('pagination.show')}</span>
        <div className="w-[80px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                role="combobox"
                aria-expanded={open}
                className="h-9 w-full justify-between bg-background px-3 font-normal text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <span>{limit}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
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
                        'relative flex w-full cursor-default select-none items-center justify-center rounded-sm py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors',
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
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onPrev}
          disabled={pageIndex === 0}
          className="gap-1 min-h-9 px-3 text-sm font-normal"
        >
          <ChevronLeft className="size-4" />
          <span>{t('pagination.prev')}</span>
        </Button>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={!hasMore}
          className="gap-1 min-h-9 px-3 text-sm font-normal"
        >
          <span>{t('pagination.next')}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
