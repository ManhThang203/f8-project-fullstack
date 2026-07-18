import { createReadStream } from 'node:fs';

import { google } from 'googleapis';

import { env } from '../../config/env.js';

import type { DriveUploadResult } from './backup.types.js';
import { getBackupFilePrefix } from './pg-dump.js';

/** Scope chỉ file do app tạo — đủ upload/prune backup trên My Drive cá nhân. */
export const GOOGLE_DRIVE_BACKUP_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Redirect URI cố định cho script `backup:auth` (OAuth Desktop + localhost). */
export const GOOGLE_DRIVE_OAUTH_REDIRECT_URI = 'http://127.0.0.1:53682/oauth2callback';

/** Tạo OAuth2 client (chưa gắn refresh_token) — dùng cho backup:auth và runtime. */
export function createOAuth2Client(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}) {
  return new google.auth.OAuth2(
    opts.clientId.trim(),
    opts.clientSecret.trim(),
    opts.redirectUri ?? GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
  );
}

/** Tạo client Drive API xác thực bằng OAuth refresh_token (tài khoản Gmail). */
function createDriveClient() {
  const auth = createOAuth2Client({
    clientId: env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: env.GOOGLE_DRIVE_CLIENT_SECRET,
  });
  auth.setCredentials({ refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN.trim() });
  return google.drive({ version: 'v3', auth });
}

/** Upload file .sql.gz lên folder My Drive (quota của user OAuth). */
export async function uploadBackupToDrive(opts: {
  folderId: string;
  localPath: string;
  fileName: string;
}): Promise<DriveUploadResult> {
  const drive = createDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: opts.fileName,
      parents: [opts.folderId],
    },
    media: {
      mimeType: 'application/gzip',
      body: createReadStream(opts.localPath),
    },
    fields: 'id, name, size, webViewLink',
    supportsAllDrives: true,
  });

  const id = res.data.id;
  if (!id) {
    throw new Error('Google Drive upload thành công nhưng không trả về file id');
  }

  const sizeRaw = res.data.size;
  return {
    id,
    name: res.data.name ?? opts.fileName,
    sizeBytes: sizeRaw != null && sizeRaw !== '' ? Number(sizeRaw) : null,
    webViewLink: res.data.webViewLink ?? null,
  };
}

type DriveListedFile = { id: string; name: string; createdTime: string };

/**
 * Liệt kê file backup (prefix costy-db-) trong folder, mới nhất trước;
 * xóa phần vượt quá retainCount. Trả về số file đã xóa.
 */
export async function pruneOldBackups(opts: {
  folderId: string;
  retainCount: number;
}): Promise<number> {
  if (opts.retainCount < 1) {
    throw new Error('BACKUP_RETAIN_COUNT phải >= 1');
  }

  const drive = createDriveClient();
  const prefix = getBackupFilePrefix();
  const files: DriveListedFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: [
        `'${opts.folderId}' in parents`,
        'trashed = false',
        `name contains '${prefix}'`,
      ].join(' and '),
      orderBy: 'createdTime desc',
      pageSize: 100,
      pageToken,
      fields: 'nextPageToken, files(id, name, createdTime)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const f of res.data.files ?? []) {
      if (f.id && f.name) {
        files.push({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime ?? '',
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  const toDelete = files.slice(opts.retainCount);
  for (const file of toDelete) {
    await drive.files.delete({
      fileId: file.id,
      supportsAllDrives: true,
    });
  }

  return toDelete.length;
}
