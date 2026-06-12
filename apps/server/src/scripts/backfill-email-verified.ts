import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const { prisma } = await import('@costy/db');

/** Đánh dấu mọi user hiện có là đã xác thực email — tránh khóa tài khoản cũ khi bật requireEmailVerification. */
async function main() {
  const result = await prisma.user.updateMany({
    where: { emailVerified: false },
    data: { emailVerified: true },
  });

  console.log(`\n✅ Đã backfill emailVerified=true cho ${result.count} tài khoản.`);
}

main()
  .catch((err) => {
    console.error('❌ Có lỗi xảy ra:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
