import { apiFetch } from './api-client';

type ProfileImageKind = 'avatar' | 'cover';

type UploadProfileImageResult = {
  url: string;
};

/** Upload ảnh đại diện hoặc ảnh bìa lên endpoint /me tương ứng và trả URL mới. */
export async function uploadProfileImage(kind: ProfileImageKind, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch<UploadProfileImageResult>(`/me/${kind}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.success) {
    throw new Error(res.error.message);
  }

  return res.data.url;
}
