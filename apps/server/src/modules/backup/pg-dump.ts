import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

import type { PgDumpConnection } from './backup.types.js';

const FILE_PREFIX = 'costy-db-';

/** Parse DATABASE_URL PostgreSQL thành host/port/user/password/database cho pg_dump. */
export function parseDatabaseUrl(databaseUrl: string): PgDumpConnection {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL không hợp lệ — không parse được URL');
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL phải dùng protocol postgresql: hoặc postgres:');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, '').split('/')[0] ?? '');
  if (!database) {
    throw new Error('DATABASE_URL thiếu tên database');
  }

  return {
    host: url.hostname || 'localhost',
    port: url.port || '5432',
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    database,
  };
}

/** Tạo tên file backup dạng costy-db-YYYY-MM-DDTHH-mm-ss.sql.gz (UTC). */
export function buildBackupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:.]/g, '-');
  return `${FILE_PREFIX}${stamp}.sql.gz`;
}

export function getBackupFilePrefix(): string {
  return FILE_PREFIX;
}

/**
 * Chạy pg_dump (plain SQL), nén gzip ra file tạm, trả về đường dẫn và kích thước.
 * Cần binary `pg_dump` trên PATH (Docker: postgresql16-client).
 */
export async function dumpDatabaseToGzip(opts: {
  databaseUrl: string;
  outputDir: string;
  fileName?: string;
}): Promise<{ filePath: string; fileName: string; sizeBytes: number }> {
  const conn = parseDatabaseUrl(opts.databaseUrl);
  const fileName = opts.fileName ?? buildBackupFileName();
  await mkdir(opts.outputDir, { recursive: true });
  const filePath = path.join(opts.outputDir, fileName);

  const args = [
    '-h',
    conn.host,
    '-p',
    conn.port,
    '-U',
    conn.user,
    '-d',
    conn.database,
    '--no-owner',
    '--no-acl',
    '-F',
    'p',
  ];

  const child = spawn('pg_dump', args, {
    env: { ...process.env, PGPASSWORD: conn.password },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const gzip = createGzip();
  const out = createWriteStream(filePath);

  const exitPromise = new Promise<number>((resolve, reject) => {
    child.on('error', (err) => {
      reject(
        new Error(
          `Không chạy được pg_dump (${err.message}). Cài postgresql-client hoặc chạy trong Docker image đã có pg_dump.`,
        ),
      );
    });
    child.on('close', (code) => resolve(code ?? 1));
  });

  try {
    await pipeline(child.stdout!, gzip, out);
    const code = await exitPromise;
    if (code !== 0) {
      throw new Error(`pg_dump thoát mã ${code}: ${stderr.trim() || 'không có stderr'}`);
    }
  } catch (err) {
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
    throw err;
  }

  const info = await stat(filePath);
  if (info.size <= 0) {
    throw new Error('File backup rỗng sau pg_dump + gzip');
  }

  return { filePath, fileName, sizeBytes: info.size };
}
