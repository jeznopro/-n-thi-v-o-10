const express = require('express');
const router = express.Router();
const { authenticate, requireTeacher } = require('../middlewares/auth');
const systemController = require('../controllers/systemController');

// Chỉ giáo viên mới có quyền sao lưu và phục hồi dữ liệu
router.get('/backup', authenticate, requireTeacher, systemController.downloadBackup);
router.post('/restore', authenticate, requireTeacher, systemController.restoreBackup);

module.exports = router;
