import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ApiResult } from '../../apiResult';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Upload specific rate limiter: max 50 requests per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    status: 429,
    code: 429,
    msg: '上传文件过于频繁，请稍后再试',
    data: null
  }
});

// Ensure directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const originalDir = path.join(uploadDir, 'original');
const compressedDir = path.join(uploadDir, 'compressed');

if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir, { recursive: true });

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.'));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

router.post('/', uploadLimiter, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.json(ApiResult.error(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return res.json(ApiResult.error(err.message, 400));
    }

    try {
      if (!req.file) {
        res.json(ApiResult.error('No file uploaded', 400));
        return;
      }

      const file = req.file;
      // Generate simple unique filename
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      
      // Paths
      const originalPath = path.join(originalDir, filename);
      const compressedPath = path.join(compressedDir, filename);

      // Save Original
      await fs.promises.writeFile(originalPath, file.buffer);

      // Compress and Save (Resize to max 800px width/height, convert to jpeg for better compression if needed, or keep format)
      // For avatars, square is often good, but let's just limit max dimension.
      // If it's not an image, sharp might fail. We should handle that.
      
      try {
          await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .toFile(compressedPath);
      } catch (e) {
          // If sharp fails (not an image), just copy the original to compressed folder or handle error?
          // Let's assume for now users upload images. If not, we just copy.
           await fs.promises.writeFile(compressedPath, file.buffer);
      }

      // Return URLs relative to server root (assuming /uploads is served statically)
      const result = {
          original: `/uploads/original/${filename}`,
          compressed: `/uploads/compressed/${filename}`,
          name: file.originalname
      };
      
      res.json(ApiResult.success(result));

    } catch (error: any) {
      console.error('Upload error:', error);
      res.json(ApiResult.error('Upload failed: ' + error.message, 500));
    }
  });
});

export default router;
