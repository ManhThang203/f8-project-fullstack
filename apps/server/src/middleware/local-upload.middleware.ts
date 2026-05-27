import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import { AppError } from '../lib/errors.js';

// Đảm bảo thư mục upload tồn tại
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ trên ổ đĩa
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Lưu với tên ngẫu nhiên UUID + đuôi file
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const localDiskUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Tối đa 500MB cho video
    files: 10,
  },
});

// Trích xuất mảng các file
export const uploadLocalMedia = localDiskUpload.array('files', 10);
