const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/news/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Không có file đính kèm.' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const relativePath = `/uploads/news/${req.file.filename}`;

  res.json({
    success: true,
    url: `${protocol}://${host}${relativePath}`,
    path: relativePath
  });
});

module.exports = router;
