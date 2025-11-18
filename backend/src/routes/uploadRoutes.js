const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/news/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    return cb(null, true);
  },
});

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Missing image file.' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const relativePath = `/uploads/news/${req.file.filename}`;

  return res.json({
    success: true,
    url: `${protocol}://${host}${relativePath}`,
    path: relativePath,
  });
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image file is too large.' });
    }
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error) {
    if (error.message === 'Invalid file type') {
      return res.status(400).json({ success: false, message: 'Unsupported image format.' });
    }
    return res.status(500).json({ success: false, message: 'Upload failed.' });
  }

  return next();
});

module.exports = router;
