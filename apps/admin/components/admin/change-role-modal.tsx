'use client';

import type { AdminUserListItemDto } from '@costy/shared';
import { ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { usePatchUserRole } from '@/hooks/queries/use-admin-queries';

const ASSIGNABLE_ROLES_ALL = ['USER', 'MODERATOR', 'ADMIN'] as const;
const ASSIGNABLE_ROLES_MODERATOR = ['USER', 'MODERATOR'] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserListItemDto | null;
  /** Chỉ super admin mới được cấp/thu hồi quyền ADMIN (khớp rule ở admin-users.service.ts). */
  currentUserIsSuperAdmin: boolean;
};

export function ChangeRoleModal({ isOpen, onClose, user, currentUserIsSuperAdmin }: Props) {
  const { t } = useTranslation();
  const patchRole = usePatchUserRole();
  const assignableRoles = useMemo(
    () => (currentUserIsSuperAdmin ? ASSIGNABLE_ROLES_ALL : ASSIGNABLE_ROLES_MODERATOR),
    [currentUserIsSuperAdmin],
  );

  const [role, setRole] = useState<string>('USER');
  const [reason, setReason] = useState('');

  /** Chỉ reset form khi mở modal hoặc đổi user — không reset sau mỗi lần chọn role trong dropdown. */
  useEffect(() => {
    if (!user || !isOpen) return;
    const allowed = currentUserIsSuperAdmin ? ASSIGNABLE_ROLES_ALL : ASSIGNABLE_ROLES_MODERATOR;
    setRole((allowed as readonly string[]).includes(user.role) ? user.role : 'USER');
    setReason('');
  }, [user?.id, user?.role, isOpen, currentUserIsSuperAdmin]);

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

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin) {
      toast.error(t('users.roleChangeError'));
      return;
    }

    patchRole.mutate(
      {
        id: user.id,
        role,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('users.roleChangeSuccess'));
          onClose();
        },
        onError: () => {
          toast.error(t('users.roleChangeError'));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-background/80 fixed inset-0 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      <div
        className="border-border bg-card animate-in fade-in-50 zoom-in-95 relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 rounded-lg p-1 transition-colors"
          aria-label={t('common.closeMenu')}
        >
          <X className="size-5" />
        </button>

        <div className="border-border flex items-center gap-2 border-b pb-4">
          <ShieldCheck className="text-primary size-5" />
          <h3 className="text-foreground pr-8 text-lg font-semibold">{t('users.roleModalTitle')}</h3>
        </div>

        <div className="text-muted-foreground mt-2 text-sm">
          <p>
            {user.name ?? user.username}{' '}
            <span className="text-muted-foreground/75 text-xs">@{user.username}</span>
          </p>
          <p className="mt-1 text-xs">
            {t('common.role')}:{' '}
            <span className="text-foreground font-semibold">{t(`roles.${user.role}`, user.role)}</span>
          </p>
        </div>

        {isSuperAdmin ? (
          <p className="border-warning/30 bg-warning/10 text-warning-foreground mt-4 rounded-xl border p-3 text-sm">
            {t('users.cannotChangeSuperAdmin')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">{t('users.roleLabel')}</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-border bg-background text-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-1">
                  <SelectValue placeholder={t('users.roleLabel')} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`roles.${r}`, r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role-reason" className="text-muted-foreground text-xs font-medium">
                {t('users.reasonLabel')}
              </label>
              <textarea
                id="role-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('users.reasonPlaceholder')}
                rows={3}
                className="border-border bg-background text-foreground focus:ring-ring flex w-full resize-none rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1"
              />
            </div>

            <div className="border-border mt-6 flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={patchRole.isPending}>
                {t('users.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={patchRole.isPending || role === user.role}
                className="min-w-20"
              >
                {patchRole.isPending ? t('common.loading') : t('users.confirm')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
