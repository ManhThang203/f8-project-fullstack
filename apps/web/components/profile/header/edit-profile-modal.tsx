'use client';

import type { ProfileDto } from '@costy/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Avatar, Modal } from '@/components/shared/ui';
import { useUpdateMyProfile } from '@/hooks/queries/profile';
import { uploadProfileImage, getUserFacingErrorMessage } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { emitAvatarUpdated } from '@/lib/events';
import { patchMyUserAppearanceInCaches, queryKeys } from '@/lib/query';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  profile: ProfileDto;
};

/** Modal chỉnh sửa trang cá nhân: tên, tiểu sử, ảnh đại diện, ảnh bìa. */
export function EditProfileModal({ open, onClose, profile }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { refetch: refetchSession } = authClient.useSession();
  const [name, setName] = useState(profile.name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateProfile = useUpdateMyProfile(profile.username);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const avatarPreview = avatarPreviewUrl ?? profile.image;
  const coverPreview = coverPreviewUrl ?? profile.coverImage;

  /** Đồng bộ session + cache sau khi có thay đổi appearance thành công. */
  async function syncAppearance(opts: {
    newAvatarUrl?: string;
    newCoverUrl?: string;
    nameChanged: boolean;
    trimmedName: string;
  }) {
    const { newAvatarUrl, newCoverUrl, nameChanged, trimmedName } = opts;
    const authorPatch = {
      ...(newAvatarUrl !== undefined ? { image: newAvatarUrl } : {}),
      ...(nameChanged ? { name: trimmedName || null } : {}),
    };

    if ('image' in authorPatch || authorPatch.name !== undefined) {
      patchMyUserAppearanceInCaches(queryClient, profile.id, authorPatch);
    }

    if (newAvatarUrl !== undefined || newCoverUrl !== undefined) {
      queryClient.setQueryData(
        queryKeys.users.profile(profile.username),
        (old: { data: ProfileDto } | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              ...(newAvatarUrl !== undefined ? { image: newAvatarUrl } : {}),
              ...(newCoverUrl !== undefined ? { coverImage: newCoverUrl } : {}),
              ...(nameChanged ? { name: trimmedName || null } : {}),
            },
          };
        },
      );
    }

    await refetchSession({ query: { disableCookieCache: true } });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(profile.username) });
    router.refresh();
  }

  /** Lưu thay đổi: upload ảnh / PATCH profile; sync phần đã thành công nếu lỗi từng bước. */
  async function handleSave() {
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    const nameChanged = trimmedName !== (profile.name ?? '');
    const bioChanged = trimmedBio !== (profile.bio ?? '');
    const hadIntent = Boolean(avatarFile || coverFile || nameChanged || bioChanged);

    if (!hadIntent) {
      onClose();
      return;
    }

    setSaving(true);

    let newAvatarUrl: string | undefined;
    let newCoverUrl: string | undefined;
    let profileSaved = false;
    let lastError: unknown;

    try {
      if (avatarFile) {
        try {
          newAvatarUrl = await uploadProfileImage('avatar', avatarFile);
          emitAvatarUpdated(newAvatarUrl);
        } catch (err) {
          lastError = err;
        }
      }

      if (coverFile) {
        try {
          newCoverUrl = await uploadProfileImage('cover', coverFile);
        } catch (err) {
          lastError = err;
        }
      }

      if (nameChanged || bioChanged) {
        try {
          await updateProfile.mutateAsync({
            name: trimmedName || undefined,
            bio: trimmedBio,
          });
          profileSaved = true;
        } catch (err) {
          lastError = err;
        }
      }

      const anySuccess =
        newAvatarUrl !== undefined || newCoverUrl !== undefined || profileSaved;

      if (!anySuccess) {
        toast.error(getUserFacingErrorMessage(lastError, 'Cập nhật thất bại'));
        return;
      }

      try {
        await syncAppearance({
          newAvatarUrl,
          newCoverUrl,
          nameChanged: nameChanged && profileSaved,
          trimmedName,
        });
      } catch (err) {
        lastError = err;
      }

      if (lastError) {
        toast.error(
          getUserFacingErrorMessage(
            lastError,
            'Đã lưu một phần thay đổi; một số bước vẫn thất bại',
          ),
        );
      } else {
        toast.success('Đã cập nhật trang cá nhân');
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissOnEsc={!saving} dismissOnBackdrop={!saving}>
      <Modal.Backdrop />
      <Modal.Panel
        from="bottom"
        size="md"
        className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl sm:max-w-[480px] sm:rounded-2xl"
      >
        <Modal.Header title="Chỉnh sửa trang cá nhân" closeDisabled={saving} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-muted mb-3 h-28 w-full overflow-hidden rounded-xl">
            {coverPreview ? (
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="from-primary/30 to-muted h-full w-full bg-gradient-to-br" />
            )}
          </div>
          <label className="text-primary mb-4 inline-block cursor-pointer text-sm font-medium hover:underline">
            Đổi ảnh bìa
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="mb-4 flex items-center gap-3">
            <Avatar as="span" src={avatarPreview} name={name} username={profile.username} size="xl" />
            <label className="text-primary cursor-pointer text-sm font-medium hover:underline">
              Đổi ảnh đại diện
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <label className="text-foreground mb-1 block text-sm font-medium" htmlFor="edit-name">
            Tên hiển thị
          </label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="bg-muted text-foreground focus-visible:ring-ring mb-4 w-full rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />

          <label className="text-foreground mb-1 block text-sm font-medium" htmlFor="edit-bio">
            Tiểu sử
          </label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="bg-muted text-foreground focus-visible:ring-ring w-full resize-none rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(
              'bg-primary text-primary-foreground min-h-11 w-full rounded-xl py-2.5 text-sm font-semibold',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              'disabled:opacity-40',
            )}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </Modal.Panel>
    </Modal>
  );
}
