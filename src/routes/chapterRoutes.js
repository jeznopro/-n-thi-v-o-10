const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middlewares/auth');
const chapterController = require('../controllers/chapterController');

// Học sinh và Giáo viên đều có thể xem danh sách chương và cấu trúc chương - bài học
router.get('/', authenticate, chapterController.getChapters);
router.get('/with-lessons', authenticate, chapterController.getChaptersWithLessons);

// Giáo viên quản lý chương: Thêm, Sửa, Xóa
router.post('/', authenticate, requireTeacher, chapterController.createChapter);
router.put('/:id', authenticate, requireTeacher, chapterController.updateChapter);
router.delete('/:id', authenticate, requireTeacher, chapterController.deleteChapter);

module.exports = router;
