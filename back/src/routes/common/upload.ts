import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { ApiResult } from '../../apiResult';

const router = Router();

// Ensure directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const originalDir = path.join(uploadDir, 'original');
const compressedDir = path.join(uploadDir, 'compressed');

if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true });
if (!fs.existsSync(compressedDir)) fs.mkdirSync(compressedDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
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

export default router;
