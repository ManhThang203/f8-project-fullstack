/** Kết quả upload một file backup lên Google Drive. */
export type DriveUploadResult = {
  id: string;
  name: string;
  sizeBytes: number | null;
  webViewLink: string | null;
};

/** Kết quả một lần chạy backup DB. */
export type BackupRunResult = {
  fileName: string;
  localPath: string;
  localSizeBytes: number;
  drive: DriveUploadResult;
  prunedCount: number;
};

/** Tham số kết nối parse từ DATABASE_URL cho pg_dump. */
export type PgDumpConnection = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
};
