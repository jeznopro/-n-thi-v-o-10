const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, requireTeacher } = require('../middlewares/auth');

// Cấu hình AI (chỉ Giáo viên)
router.get('/settings', authenticate, requireTeacher, aiController.getSettings);
router.post('/settings', authenticate, requireTeacher, aiController.updateSettings);
router.post('/test-key', authenticate, requireTeacher, aiController.testConnection);

// Soạn đề Toán bằng AI (chỉ Giáo viên)
router.post('/generate-questions', authenticate, requireTeacher, aiController.generateQuestions);

// Phân tích bài làm & Gợi ý lời phê (chỉ Giáo viên)
router.post('/review-submission', authenticate, requireTeacher, aiController.reviewSubmission);

// Gợi ý hướng giải (Socratic hint) - Dành cho Học sinh trong phòng làm bài & Giáo viên
router.post('/hint', authenticate, aiController.getHint);

// Gia sư AI Toán Socratic (Hỏi đáp, trao đổi tư duy tương tác cho Học sinh)
router.post('/tutor-chat', authenticate, aiController.tutorChat);

// Giải thích chi tiết câu hỏi - Dành cho Học sinh sau thi & Giáo viên
router.post('/explain', authenticate, aiController.explainSolution);

// Xem danh sách học sinh hỏi AI (Giáo viên)
router.get('/interactions', authenticate, requireTeacher, aiController.getInteractions);

// Lấy lịch sử hỏi AI của chính mình theo bài tập (Học sinh & Giáo viên)
router.get('/interactions/my', authenticate, aiController.getMyInteractions);

// Chẩn đoán & Báo cáo Lỗ hổng kiến thức tổng hợp của học sinh (Giáo viên)
router.get('/diagnostics', authenticate, requireTeacher, aiController.getKnowledgeGapDiagnostics);
router.post('/diagnostics/refresh', authenticate, requireTeacher, aiController.getKnowledgeGapDiagnostics);

module.exports = router;

