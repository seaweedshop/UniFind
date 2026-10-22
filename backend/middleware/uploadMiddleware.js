const multer = require('multer');

const fileFilter = (_req, file, callback) => {
  if (!file.mimetype.startsWith('image/')) {
    return callback(new Error('Only image files are allowed.'));
  }

  return callback(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const singleImageUpload = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be smaller than 5MB.'
      : error.message || 'Invalid image upload.';

    return res.status(400).json({ message });
  });
};

module.exports = {
  upload,
  singleImageUpload,
};
