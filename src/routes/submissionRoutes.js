const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, requireStudent } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { sanitizeRequestBody } = require('../middlewares/sanitize');

// Toàn bộ route làm bài tự luận dành riêng cho Học sinh
router.use(authenticate, requireStudent);

// Bắt đầu làm bài / Vào phòng thi
router.get('/start/:assignmentId', submissionController.startExam);

// Tự động lưu nháp
router.post('/auto-save', sanitizeRequestBody, submissionController.autoSaveDraft);

// Nộp bài chính thức
router.post('/submit', sanitizeRequestBody, submissionController.submitEssay);

// Upload ảnh bài giải viết tay hoặc file đính kèm
router.post('/attachments', upload.single('file'), submissionController.uploadSubmissionAttachment);

// Xóa tệp đính kèm khi bài còn là bản nháp
router.delete('/attachments/:attachmentId', submissionController.deleteSubmissionAttachment);

module.exports = router;
