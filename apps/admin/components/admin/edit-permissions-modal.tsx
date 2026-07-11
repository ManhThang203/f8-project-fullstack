'use client';

import type { AdminModeratorDto, AdminPermissionDto } from '@costy/shared';
import { X, ShieldAlert, Loader2, Key } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';
import { useUserPermissions, useUpdateUserPermissions } from '@/hooks/queries/use-admin-queries';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminModeratorDto | null;
};

export function EditPermissionsModal({ isOpen, onClose, user }: Props) {
  const { t } = useTranslation();
  const { data: permissions, isLoading } = useUserPermissions(user?.id ?? '');
  const updatePermissions = useUpdateUserPermissions();

  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});

  // Reset checked keys when new permissions data loaded or modal opens
  useEffect(() => {
    if (isOpen && permissions?.data) {
      const initialChecked: Record<string, boolean> = {};
      permissions.data.forEach((p) => {
        const isChecked = p.effect === 'GRANT' || (p.isDefaultForRole && p.effect !== 'REVOKE');
        initialChecked[p.key] = isChecked;
      });
      setCheckedKeys(initialChecked);
    }
  }, [permissions, isOpen]);

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

  // Group permissions by domain for clean UI
  const groupedPermissions = useMemo(() => {
    if (!permissions?.data) return {};
    const groups: Record<string, AdminPermissionDto[]> = {};
    permissions.data.forEach((p) => {
      if (!groups[p.domain]) {
        groups[p.domain] = [];
      }
      groups[p.domain]!.push(p);
    });
    return groups;
  }, [permissions]);

  if (!isOpen || !user) return null;

  const isReadOnlyRole = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

  const handleToggle = (key: string) => {
    if (isReadOnlyRole) return;
    setCheckedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyRole) {
      toast.error(t('moderators.saveError'));
      return;
    }
    if (!permissions?.data) return;

    const grants: string[] = [];
    const revokes: string[] = [];

    permissions.data.forEach((p) => {
      const isCurrentlyChecked = !!checkedKeys[p.key];
      const isOriginallyChecked =
        p.effect === 'GRANT' || (p.isDefaultForRole && p.effect !== 'REVOKE');

      if (isCurrentlyChecked !== isOriginallyChecked) {
        if (isCurrentlyChecked) {
          grants.push(p.key);
        } else {
          revokes.push(p.key);
        }
      }
    });

    updatePermissions.mutate(
      {
        id: user.id,
        grants,
        revokes,
      },
      {
        onSuccess: () => {
          toast.success(t('moderators.saveSuccess'));
          onClose();
        },
        onError: () => {
          toast.error(t('moderators.saveError'));
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
      <div className="border-border bg-card animate-in fade-in-50 zoom-in-95 relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border p-6 shadow-xl duration-200">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 rounded-lg p-1 transition-colors"
          aria-label={t('common.closeMenu')}
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="border-border flex items-center gap-2 border-b pb-4">
          <Key className="text-primary size-5" />
          <div>
            <h3 className="text-foreground pr-8 text-lg font-semibold">
              {t('moderators.modalTitle', { name: user.name ?? user.username })}
            </h3>
            <p className="text-muted-foreground text-xs">
              @{user.username} • {t('common.role')}:{' '}
              <span className="text-foreground font-semibold">
                {t(`roles.${user.role}`, user.role)}
              </span>
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-1">
          {isReadOnlyRole && (
            <div className="border-warning/30 bg-warning/10 text-warning-foreground flex items-start gap-2.5 rounded-xl border p-3.5 text-sm">
              <ShieldAlert className="text-warning size-5 shrink-0" />
              <p>
                {user.role === 'SUPER_ADMIN'
                  ? t('moderators.superAdminWarning')
                  : t('moderators.adminWarning')}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="text-primary size-8 animate-spin" />
              <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
            </div>
          ) : !permissions?.data || permissions.data.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {t('moderators.noPermissions')}
            </div>
          ) : (
            <form id="edit-permissions-form" onSubmit={handleSubmit} className="space-y-6">
              {Object.entries(groupedPermissions).map(([domain, items]) => {
                const domainLabel = t(`moderators.domainLabel.${domain}`, domain);
                return (
                  <div key={domain} className="space-y-2.5">
                    <h4 className="text-muted-foreground border-border/50 border-b pb-1 text-xs font-semibold uppercase tracking-wider">
                      {domainLabel}
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {items.map((p) => {
                        const isChecked = !!checkedKeys[p.key];

                        // Determine badge type
                        let badgeText = '';
                        let badgeClass = '';
                        if (isChecked !== p.isDefaultForRole) {
                          if (isChecked) {
                            badgeText = t('moderators.customGranted');
                            badgeClass = 'bg-success/10 text-success-foreground border-success/20';
                          } else {
                            badgeText = t('moderators.customRevoked');
                            badgeClass =
                              'bg-destructive/10 text-destructive-foreground border-destructive/20';
                          }
                        } else if (p.isDefaultForRole) {
                          badgeText = t('moderators.defaultForRole');
                          badgeClass = 'bg-muted text-muted-foreground border-border';
                        }

                        return (
                          <div
                            key={p.key}
                            onClick={() => handleToggle(p.key)}
                            className={`flex cursor-pointer select-none items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isChecked
                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                : 'bg-background border-border hover:bg-muted/50'
                            } ${isReadOnlyRole ? 'cursor-not-allowed opacity-70' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              disabled={isReadOnlyRole}
                              className="border-border text-primary focus:ring-primary mt-1 h-4 w-4 cursor-pointer rounded disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-foreground text-sm font-medium">
                                  {t(`permissions.${p.key}`, p.label)}
                                </span>
                                {badgeText && (
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                                  >
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={updatePermissions.isPending}
          >
            {t('users.cancel')}
          </Button>
          <Button
            type="submit"
            form="edit-permissions-form"
            disabled={isLoading || isReadOnlyRole || updatePermissions.isPending}
            className="min-w-24"
          >
            {updatePermissions.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin" />
                {t('common.loading')}
              </span>
            ) : (
              t('users.confirm')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
