const express = require('express');
const router = express.Router();
const gradingController = require('../controllers/gradingController');
const { authenticate, requireTeacher } = require('../middlewares/auth');
const { sanitizeRequestBody } = require('../middlewares/sanitize');

// Toàn bộ chức năng chấm bài yêu cầu quyền Giáo viên
router.use(authenticate, requireTeacher);

// Danh sách học sinh nộp bài của 1 bài tập
router.get('/assignments/:assignmentId', gradingController.getSubmissionsByAssignment);

// Chi tiết 1 bài nộp để chấm
router.get('/submissions/:submissionId', gradingController.getSubmissionDetail);

// Chấm điểm theo rubric & viết nhận xét
router.post('/submissions/:submissionId/grade', sanitizeRequestBody, gradingController.gradeSubmission);

// Yêu cầu học sinh làm lại bài
router.post('/submissions/:submissionId/request-resubmission', gradingController.requestResubmission);

// Xuất bảng điểm ra file Excel
router.get('/assignments/:assignmentId/export', gradingController.exportGradebook);

module.exports = router;
