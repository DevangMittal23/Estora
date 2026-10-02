import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) =>
    cb(
      types.includes(file.mimetype)
        ? null
        : new ApiError(400, 'INVALID_FILE', 'Use a JPEG, PNG, WebP or PDF file'),
      types.includes(file.mimetype)
    ),
});
