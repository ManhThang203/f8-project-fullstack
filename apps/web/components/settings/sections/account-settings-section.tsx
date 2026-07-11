'use client';

import {
  changeEmailSettingsSchema,
  changeUsernameSettingsSchema,
  type ChangeEmailSettingsForm,
  type ChangeUsernameSettingsForm,
} from '@costy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { EditProfileModal } from '@/components/profile/header/edit-profile-modal';
import {
  settingsErrorClass,
  settingsFieldClass,
  settingsInputClass,
  settingsLabelClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/settings-input-class';
import { SettingsSection } from '@/components/settings/settings-section';
import { Button } from '@/components/shared/ui';
import { useProfile } from '@/hooks/queries/profile';
import { authClient, getAuthClientErrorMessage } from '@/lib/auth';

type Props = {
  username: string;
  email: string | null;
};

/** Form đổi username, email và mở modal chỉnh sửa profile. */
export function AccountSettingsSection({ username, email }: Props) {
  const { refetch: refetchSession } = authClient.useSession();
  const { data: profile } = useProfile(username);
  const [editOpen, setEditOpen] = useState(false);

  const usernameForm = useForm<ChangeUsernameSettingsForm>({
    resolver: zodResolver(changeUsernameSettingsSchema),
    defaultValues: { username },
  });

  const emailForm = useForm<ChangeEmailSettingsForm>({
    resolver: zodResolver(changeEmailSettingsSchema),
    defaultValues: { email: email ?? '' },
  });

  async function onSubmitUsername(data: ChangeUsernameSettingsForm) {
    if (data.username === username) {
      toast.message('Username không thay đổi');
      return;
    }

    const res = await authClient.updateUser({ username: data.username });
    if (res.error) {
      toast.error(getAuthClientErrorMessage(res.error, 'Không thể đổi username'));
      return;
    }

    await refetchSession();
    toast.success('Đã cập nhật username');
  }

  async function onSubmitEmail(data: ChangeEmailSettingsForm) {
    if (data.email === (email ?? '')) {
      toast.message('Email không thay đổi');
      return;
    }

    const res = await authClient.changeEmail({
      newEmail: data.email,
      callbackURL: `${window.location.origin}/settings/account`,
    });
    if (res.error) {
      toast.error(getAuthClientErrorMessage(res.error, 'Không thể đổi email'));
      return;
    }

    toast.success('Kiểm tra email để xác nhận địa chỉ mới');
  }

  return (
    <>
      <SettingsSection
        title="Thông tin công khai"
        description="Tên hiển thị, tiểu sử, ảnh đại diện và ảnh bìa."
      >
        <Button variant="secondary" size="md" className={settingsSecondaryButtonClass} onClick={() => setEditOpen(true)}>
          Chỉnh sửa trang cá nhân
        </Button>
      </SettingsSection>

      <SettingsSection title="Username" description="Địa chỉ duy nhất trên Cotsy (@username).">
        <form
          className="flex flex-col gap-5"
          onSubmit={usernameForm.handleSubmit(onSubmitUsername)}
          noValidate
        >
          <div className={settingsFieldClass}>
            <label className={settingsLabelClass} htmlFor="settings-username">
              Username
            </label>
            <input
              id="settings-username"
              className={settingsInputClass}
              autoComplete="username"
              aria-invalid={usernameForm.formState.errors.username ? true : undefined}
              {...usernameForm.register('username')}
            />
            {usernameForm.formState.errors.username ? (
              <p className={settingsErrorClass}>
                {usernameForm.formState.errors.username.message}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={usernameForm.formState.isSubmitting}
            className="self-start"
          >
            Lưu username
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection title="Email" description="Dùng để đăng nhập và nhận thông báo bảo mật.">
        <form
          className="flex flex-col gap-5"
          onSubmit={emailForm.handleSubmit(onSubmitEmail)}
          noValidate
        >
          <div className={settingsFieldClass}>
            <label className={settingsLabelClass} htmlFor="settings-email">
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              className={settingsInputClass}
              autoComplete="email"
              aria-invalid={emailForm.formState.errors.email ? true : undefined}
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email ? (
              <p className={settingsErrorClass}>{emailForm.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={emailForm.formState.isSubmitting}
            className="self-start"
          >
            Lưu email
          </Button>
        </form>
      </SettingsSection>

      {profile ? (
        <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      ) : null}
    </>
  );
}

/** Wrapper đọc session rồi render section tài khoản. */
export function AccountSettingsView() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return <p className="text-muted-foreground text-sm">Đang tải…</p>;
  }

  if (!user?.username) {
    return <p className="text-muted-foreground text-sm">Không tải được thông tin tài khoản.</p>;
  }

  return (
    <AccountSettingsSection
      username={user.username}
      email={typeof user.email === 'string' ? user.email : null}
    />
  );
}
