/**
 * Chạy một lần backup DB → Google Drive (không chờ cron 03:00).
 * Usage: pnpm --filter @costy/server backup:once
 */

import { env } from '../config/env.js';
import { runDbBackup } from '../modules/backup/backup.service.js';

async function main(): Promise<void> {
  if (!env.BACKUP_ENABLED) {
    console.error(
      'BACKUP_ENABLED=false. Đặt BACKUP_ENABLED=true và điền Drive OAuth (CLIENT_ID/SECRET/REFRESH_TOKEN) + SMTP trong .env rồi chạy lại.',
    );
    process.exit(1);
  }

  console.log('Đang chạy backup DB một lần...');
  const result = await runDbBackup();
  console.log(
    JSON.stringify(
      {
        fileName: result.fileName,
        sizeBytes: result.localSizeBytes,
        driveFileId: result.drive.id,
        webViewLink: result.drive.webViewLink,
        prunedCount: result.prunedCount,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('Backup thất bại:', err instanceof Error ? err.message : err);
  process.exit(1);
});
