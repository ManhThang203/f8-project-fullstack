import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const { prisma } = await import('@costy/db');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Vui lòng cung cấp email. Ví dụ: pnpm promote admin11@gmail.com');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(
      `❌ Không tìm thấy user với email ${email}. Vui lòng đăng ký tài khoản trước trên giao diện (Sign Up).`,
    );
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log(
    `\n🎉 Nâng quyền thành công cho tài khoản "${email}" thành SUPER_ADMIN! Bây giờ bạn có thể đăng nhập vào Admin.`,
  );
}

main()
  .catch((err) => {
    console.error('❌ Có lỗi xảy ra:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
