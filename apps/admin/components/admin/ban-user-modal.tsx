'use client';

import type { AdminUserListItemDto } from '@costy/shared';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/select';
import { usePatchUserStatus } from '@/hooks/queries/use-admin-queries';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserListItemDto | null;
};

export function BanUserModal({ isOpen, onClose, user }: Props) {
  const { t } = useTranslation();
  const patchStatus = usePatchUserStatus();

  const [action, setAction] = useState<string>('lock');
  const [reason, setReason] = useState<string>('');
  const [durationPreset, setDurationPreset] = useState<string>('7d');
  const [customDate, setCustomDate] = useState<string>('');

  // Reset form when modal opens with a user
  useEffect(() => {
    if (user) {
      // Set default action based on current status
      if (user.status === 'ACTIVE') {
        setAction('lock');
      } else if (user.status === 'LOCKED') {
        setAction('unlock');
      } else if (user.status === 'BANNED') {
        setAction('unban');
      }
      setReason('');
      setDurationPreset('7d');

      // Default custom date to 7 days from now formatted for datetime-local
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      // Format as YYYY-MM-DDThh:mm
      const formatted = nextWeek.toISOString().slice(0, 16);
      setCustomDate(formatted);
    }
  }, [user, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error(t('users.reasonRequired'));
      return;
    }

    let bannedUntil: string | undefined = undefined;

    if (action === 'ban_temp') {
      if (durationPreset === 'custom') {
        if (!customDate) {
          toast.error(t('users.customDateLabel'));
          return;
        }
        bannedUntil = new Date(customDate).toISOString();
      } else {
        const days = durationPreset === '1d' ? 1 : durationPreset === '30d' ? 30 : 7;
        bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    patchStatus.mutate(
      {
        id: user.id,
        action,
        reason: reason.trim(),
        bannedUntil,
      },
      {
        onSuccess: () => {
          toast.success(t('users.successUpdate'));
          onClose();
        },
        onError: () => {
          toast.error(t('users.errorUpdate'));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="bg-background/80 fixed inset-0 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="border-border bg-card animate-in fade-in-50 zoom-in-95 relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-xl duration-200">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 rounded-lg p-1 transition-colors"
          aria-label={t('common.closeMenu')}
        >
          <X className="size-5" />
        </button>

        <h3 className="text-foreground pr-8 text-lg font-semibold">{t('users.modalTitle')}</h3>

        <div className="text-muted-foreground mt-2 text-sm">
          <p>
            {user.name ?? user.username}{' '}
            <span className="text-muted-foreground/75 text-xs">@{user.username}</span>
          </p>
          <p className="mt-1 text-xs">
            {t('common.status')}:{' '}
            <span className="text-foreground font-semibold">{t(`status.${user.status}`)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Action Select */}
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              {t('users.statusLabel')}
            </label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="border-border bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-1">
                <SelectValue placeholder={t('users.statusLabel')} />
              </SelectTrigger>
              <SelectContent>
                {user.status === 'ACTIVE' ? (
                  <>
                    <SelectItem value="lock">{t('users.statusLock')}</SelectItem>
                    <SelectItem value="ban_temp">{t('users.statusBanTemp')}</SelectItem>
                    <SelectItem value="ban_perm">{t('users.statusBanPerm')}</SelectItem>
                  </>
                ) : user.status === 'LOCKED' ? (
                  <>
                    <SelectItem value="unlock">{t('users.statusActive')}</SelectItem>
                    <SelectItem value="ban_temp">{t('users.statusBanTemp')}</SelectItem>
                    <SelectItem value="ban_perm">{t('users.statusBanPerm')}</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="unban">{t('users.statusActive')}</SelectItem>
                    <SelectItem value="lock">{t('users.statusLock')}</SelectItem>
                    <SelectItem value="ban_temp">{t('users.statusBanTemp')}</SelectItem>
                    <SelectItem value="ban_perm">{t('users.statusBanPerm')}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Ban Duration Select (Visible only for ban_temp) */}
          {action === 'ban_temp' && (
            <div className="border-border bg-muted/30 animate-in slide-in-from-top-2 space-y-4 rounded-lg border p-3 duration-150">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('users.banDurationLabel')}
                </label>
                <Select value={durationPreset} onValueChange={setDurationPreset}>
                  <SelectTrigger className="border-border bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-1">
                    <SelectValue placeholder={t('users.banDurationLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">{t('users.durationPreset1d')}</SelectItem>
                    <SelectItem value="7d">{t('users.durationPreset7d')}</SelectItem>
                    <SelectItem value="30d">{t('users.durationPreset30d')}</SelectItem>
                    <SelectItem value="custom">{t('users.durationCustom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {durationPreset === 'custom' && (
                <div className="animate-in fade-in-50 space-y-1.5 duration-150">
                  <label
                    htmlFor="modal-custom-date"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    {t('users.customDateLabel')}
                  </label>
                  <input
                    id="modal-custom-date"
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    required
                    className="datetime-input border-border bg-background text-foreground focus:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label htmlFor="modal-reason" className="text-muted-foreground text-xs font-medium">
              {t('users.reasonLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="modal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('users.reasonPlaceholder')}
              required
              rows={3}
              className="border-border bg-background text-foreground focus:ring-ring flex w-full resize-none rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={patchStatus.isPending}
            >
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={patchStatus.isPending} className="min-w-20">
              {patchStatus.isPending ? t('common.loading') : t('users.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
