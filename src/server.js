const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = require('./database/db');
const { apiLimiter } = require('./middlewares/rateLimit');
const errorHandler = require('./middlewares/errorHandler');

// Nhập các route
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const gradingRoutes = require('./routes/gradingRoutes');
const auditRoutes = require('./routes/auditRoutes');
const aiRoutes = require('./routes/aiRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Đảm bảo thư mục lưu file upload tồn tại
const uploadDirs = [
  path.join(__dirname, '../uploads/assignments'),
  path.join(__dirname, '../uploads/submissions')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware cơ bản
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Áp dụng giới hạn tần suất request (chống DoS)
app.use('/api', apiLimiter);

// Phục vụ tệp tĩnh Frontend và Tệp upload
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Đăng ký các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grading', gradingRoutes);
app.use('/api/teacher', auditRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/system', systemRoutes);

// Route mặc định điều hướng trang chính
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Bắt lỗi tập trung
app.use(errorHandler);

// Khởi chạy server nếu chạy trực tiếp
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('============================================================');
    console.log(`🚀 HỆ THỐNG LÀM BÀI TỰ LUẬN MÔN TOÁN THCS ĐANG CHẠY`);
    console.log(`📡 Địa chỉ máy tính:    http://localhost:${PORT}`);
    console.log(`🌐 Mạng nội bộ (LAN):  http://<IP_MÁY_BẠN>:${PORT}`);
    console.log('============================================================');
  });
}

module.exports = app;
