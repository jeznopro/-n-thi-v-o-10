const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } = require('../config/constants');

// Cấu hình lưu trữ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = path.join(__dirname, '../../uploads');

    if (req.baseUrl.includes('assignment') || req.path.includes('assignment')) {
      dest = path.join(dest, 'assignments');
    } else if (req.baseUrl.includes('submission') || req.path.includes('submission')) {
      dest = path.join(dest, 'submissions');
    }

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Làm sạch tên file gốc
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Bộ lọc định dạng file hợp lệ
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Định dạng tệp "${file.mimetype}" không được hỗ trợ. Chỉ chấp nhận ảnh (JPG, PNG, WebP), PDF, Word hoặc Excel.`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
});

module.exports = upload;
