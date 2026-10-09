const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middlewares/auth');
const lessonController = require('../controllers/lessonController');

// Học sinh và Giáo viên đều có thể xem danh sách bài giảng và chi tiết
router.get('/', authenticate, lessonController.getAllLessons);
router.get('/:id', authenticate, lessonController.getLessonById);

// Giáo viên quản lý bài giảng: Thêm, Sửa, Xóa
router.post('/', authenticate, requireTeacher, lessonController.createLesson);
router.put('/:id', authenticate, requireTeacher, lessonController.updateLesson);
router.delete('/:id', authenticate, requireTeacher, lessonController.deleteLesson);

module.exports = router;
