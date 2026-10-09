const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, requireTeacher } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Toàn bộ route quản lý học sinh yêu cầu quyền Giáo viên
router.use(authenticate, requireTeacher);

router.get('/', teacherController.getStudents);
router.post('/', teacherController.createStudent);
router.put('/:id', teacherController.updateStudent);
router.patch('/:id/toggle-lock', teacherController.toggleLockStudent);
router.post('/:id/reset-password', teacherController.resetStudentPassword);
router.delete('/:id', teacherController.deleteStudent);

// Tải file mẫu & Import danh sách học sinh
router.get('/template/download', teacherController.downloadImportTemplate);
router.post('/import', upload.single('file'), teacherController.importStudents);

module.exports = router;
