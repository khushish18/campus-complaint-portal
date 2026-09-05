const multer = require('multer');
const path = require('path');

// Multer storage config (using memory storage for easy Cloudinary integration)
const storage = multer.memoryStorage();

// File filter to restrict uploads to images (JPEG, JPG, PNG, WEBP, GIF) and PDF document types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /^\.(jpeg|jpg|png|webp|gif|pdf)$/i;
  const allowedMimeTypes = /^(image\/(jpeg|jpg|png|webp|gif)|application\/pdf)$/i;

  const ext = path.extname(file.originalname).toLowerCase();
  const validExt = allowedExtensions.test(ext);
  const validMime = allowedMimeTypes.test(file.mimetype);

  if (validExt && validMime) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP, GIF) and PDF documents are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

module.exports = upload;
