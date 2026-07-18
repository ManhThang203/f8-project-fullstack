import { describe, expect, it } from 'vitest';

import { buildBackupFileName, getBackupFilePrefix, parseDatabaseUrl } from './pg-dump.js';

describe('parseDatabaseUrl', () => {
  it('parse URL đầy đủ', () => {
    const c = parseDatabaseUrl(
      'postgresql://costy:mat%40khau@127.0.0.1:5433/costy?schema=public',
    );
    expect(c).toEqual({
      host: '127.0.0.1',
      port: '5433',
      user: 'costy',
      password: 'mat@khau',
      database: 'costy',
    });
  });

  it('mặc định port 5432 khi thiếu', () => {
    const c = parseDatabaseUrl('postgres://u:p@dbhost/mydb');
    expect(c.port).toBe('5432');
    expect(c.host).toBe('dbhost');
    expect(c.database).toBe('mydb');
  });

  it('ném lỗi khi thiếu database', () => {
    expect(() => parseDatabaseUrl('postgresql://u:p@localhost/')).toThrow(/database/i);
  });
});

describe('buildBackupFileName', () => {
  it('đúng prefix và đuôi .sql.gz', () => {
    const name = buildBackupFileName(new Date('2026-07-18T03:00:00.000Z'));
    expect(name.startsWith(getBackupFilePrefix())).toBe(true);
    expect(name.endsWith('.sql.gz')).toBe(true);
    expect(name).toContain('2026-07-18');
  });
});
