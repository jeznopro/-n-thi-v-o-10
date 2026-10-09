const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, requireTeacher, requireStudent } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { sanitizeRequestBody } = require('../middlewares/sanitize');

// Giáo viên xem danh sách bài tập
router.get('/teacher', authenticate, requireTeacher, assignmentController.getTeacherAssignments);

// Học sinh xem danh sách bài tập của mình
router.get('/student', authenticate, requireStudent, assignmentController.getStudentAssignments);

// Xem chi tiết bài tập theo ID (cả GV và HS đều có thể xem nếu có quyền)
router.get('/:id', authenticate, assignmentController.getAssignmentById);

// Giáo viên tạo bài tập mới kèm đính kèm file
router.post(
  '/',
  authenticate,
  requireTeacher,
  upload.array('attachments', 5),
  sanitizeRequestBody,
  assignmentController.createAssignment
);

// Giáo viên nhập câu hỏi từ file Word (.docx)
router.post(
  '/import-word',
  authenticate,
  requireTeacher,
  upload.single('wordFile'),
  assignmentController.importFromWord
);

// Giáo viên xóa bài tập
router.delete('/:id', authenticate, requireTeacher, assignmentController.deleteAssignment);

module.exports = router;
