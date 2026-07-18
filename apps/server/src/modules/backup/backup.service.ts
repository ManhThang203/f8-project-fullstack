import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { sendMail } from '../../lib/mail.js';

import type { BackupRunResult } from './backup.types.js';
import { pruneOldBackups, uploadBackupToDrive } from './google-drive.js';
import { dumpDatabaseToGzip } from './pg-dump.js';

/** Kiểm tra đủ env khi bật backup; ném lỗi rõ nếu thiếu. */
export function assertBackupConfig(): void {
  const missing: string[] = [];
  if (!env.BACKUP_NOTIFY_EMAIL.trim()) missing.push('BACKUP_NOTIFY_EMAIL');
  if (!env.GOOGLE_DRIVE_FOLDER_ID.trim()) missing.push('GOOGLE_DRIVE_FOLDER_ID');
  if (!env.GOOGLE_DRIVE_CLIENT_ID.trim()) missing.push('GOOGLE_DRIVE_CLIENT_ID');
  if (!env.GOOGLE_DRIVE_CLIENT_SECRET.trim()) missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
  if (!env.GOOGLE_DRIVE_REFRESH_TOKEN.trim()) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
  if (missing.length > 0) {
    throw new Error(`Backup thiếu cấu hình: ${missing.join(', ')}`);
  }
}

// Hàm định dạng kích thước file
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Gửi email thông báo backup thành công (nuốt lỗi SMTP để không che kết quả backup). */
async function notifyBackupSuccess(result: BackupRunResult): Promise<void> {
  const to = env.BACKUP_NOTIFY_EMAIL.trim();
  if (!to) return;

  const link = result.drive.webViewLink ? `\nDrive: ${result.drive.webViewLink}` : '';
  try {
    await sendMail({
      to,
      subject: `[${env.APP_NAME}] Backup DB thành công — ${result.fileName}`,
      text: [
        'Backup PostgreSQL đã hoàn tất.',
        '',
        `File: ${result.fileName}`,
        `Kích thước: ${formatBytes(result.localSizeBytes)}`,
        `Drive file id: ${result.drive.id}`,
        `Đã xóa file thừa: ${result.prunedCount}`,
        `Giữ tối đa: ${env.BACKUP_RETAIN_COUNT} file`,
        link,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    logger.error({ err }, 'Gửi email backup success thất bại');
  }
}

/** Gửi email thông báo backup thất bại (không lộ private key). */
async function notifyBackupFailure(errorMessage: string): Promise<void> {
  const to = env.BACKUP_NOTIFY_EMAIL.trim();
  if (!to) return;

  const safe = errorMessage
    .replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/g, '[REDACTED_KEY]')
    .slice(0, 2000);

  try {
    await sendMail({
      to,
      subject: `[${env.APP_NAME}] Backup DB thất bại`,
      text: `Backup PostgreSQL thất bại.\n\nLỗi:\n${safe}`,
    });
  } catch (err) {
    logger.error({ err }, 'Gửi email backup failure thất bại');
  }
}

/**
 * Orchestrate backup: pg_dump + gzip → upload Drive → prune → email.
 * Dọn file tạm dù thành công hay lỗi.
 */
export async function runDbBackup(): Promise<BackupRunResult> {
  assertBackupConfig();

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'costy-db-backup-'));
  let localPath: string | undefined;

  try {
    logger.info({ tmpRoot }, 'Bắt đầu backup DB');

    const dump = await dumpDatabaseToGzip({
      databaseUrl: env.DATABASE_URL,
      outputDir: tmpRoot,
    });
    localPath = dump.filePath;

    const drive = await uploadBackupToDrive({
      folderId: env.GOOGLE_DRIVE_FOLDER_ID.trim(),
      localPath: dump.filePath,
      fileName: dump.fileName,
    });

    // Prune lỗi không fail job — tránh BullMQ retry → upload trùng file đã lên Drive.
    let prunedCount = 0;
    try {
      prunedCount = await pruneOldBackups({
        folderId: env.GOOGLE_DRIVE_FOLDER_ID.trim(),
        retainCount: env.BACKUP_RETAIN_COUNT,
      });
    } catch (err) {
      logger.error(
        { err },
        'Prune backup trên Drive thất bại — backup vẫn coi thành công để tránh upload trùng khi retry',
      );
    }

    const result: BackupRunResult = {
      fileName: dump.fileName,
      localPath: dump.filePath,
      localSizeBytes: dump.sizeBytes,
      drive,
      prunedCount,
    };

    logger.info(
      {
        fileName: result.fileName,
        sizeBytes: result.localSizeBytes,
        driveFileId: result.drive.id,
        prunedCount,
      },
      'Backup DB thành công',
    );

    await notifyBackupSuccess(result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'Backup DB thất bại');
    await notifyBackupFailure(message);
    throw err;
  } finally {
    try {
      await rm(tmpRoot, { recursive: true, force: true });
    } catch (err) {
      logger.warn({ err, tmpRoot, localPath }, 'Không xóa được thư mục tạm backup');
    }
  }
}
