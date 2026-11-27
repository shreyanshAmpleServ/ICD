import express from 'express';
import multer from 'multer';
import { uploadImageController } from '../../controllers/assetImages.controller';

const router = express.Router();

// Store uploaded file in memory as Buffer (not on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post('/upload', upload.single('file'), uploadImageController);
router.post('/upload/image', upload.single('file'), uploadImageController);

export { router as uploadRouter };
export default router;
