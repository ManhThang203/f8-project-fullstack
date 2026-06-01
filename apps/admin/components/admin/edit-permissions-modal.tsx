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

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const handleToggle = (key: string) => {
    if (isSuperAdmin) return;
    setCheckedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin) {
      toast.error(t('moderators.saveError'));
      return;
    }
    if (!permissions?.data) return;

    const grants: string[] = [];
    const revokes: string[] = [];

    permissions.data.forEach((p) => {
      const isCurrentlyChecked = !!checkedKeys[p.key];
      const isOriginallyChecked = p.effect === 'GRANT' || (p.isDefaultForRole && p.effect !== 'REVOKE');

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
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[85vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground p-1"
          aria-label={t('common.closeMenu')}
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Key className="size-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground pr-8">
              {t('moderators.modalTitle', { name: user.name ?? user.username })}
            </h3>
            <p className="text-xs text-muted-foreground">
              @{user.username} • {t('common.role')}: <span className="font-semibold text-foreground">{user.role}</span>
            </p>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {isSuperAdmin && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-sm text-warning-foreground">
              <ShieldAlert className="size-5 shrink-0 text-warning" />
              <p>
                {t('moderators.saveError')}: Không thể chỉnh sửa quyền hạn của tài khoản Super Admin. Tài khoản Super Admin mặc định sở hữu toàn bộ đặc quyền trên hệ thống.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : !permissions?.data || permissions.data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('moderators.noPermissions')}
            </div>
          ) : (
            <form id="edit-permissions-form" onSubmit={handleSubmit} className="space-y-6">
              {Object.entries(groupedPermissions).map(([domain, items]) => {
                const domainLabel = t(`moderators.domainLabel.${domain}`, domain);
                return (
                  <div key={domain} className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
                      {domainLabel}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((p) => {
                        const isChecked = !!checkedKeys[p.key];
                        
                        // Determine badge type
                        let badgeText = '';
                        let badgeClass = '';
                        if (isChecked !== p.isDefaultForRole) {
                          if (isChecked) {
                            badgeText = t('moderators.customGranted');
                            badgeClass = 'bg-success/10 text-success border-success/20';
                          } else {
                            badgeText = t('moderators.customRevoked');
                            badgeClass = 'bg-destructive/10 text-destructive border-destructive/20';
                          }
                        } else if (p.isDefaultForRole) {
                          badgeText = t('moderators.defaultForRole');
                          badgeClass = 'bg-muted text-muted-foreground border-border';
                        }

                        return (
                          <div 
                            key={p.key} 
                            onClick={() => handleToggle(p.key)}
                            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer select-none
                              ${isChecked 
                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                                : 'bg-background border-border hover:bg-muted/50'
                              } ${isSuperAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              disabled={isSuperAdmin}
                              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{p.label}</span>
                                {badgeText && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${badgeClass}`}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">{p.key}</p>
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
        <div className="border-t border-border pt-4 flex justify-end gap-3">
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
            disabled={isLoading || isSuperAdmin || updatePermissions.isPending}
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
