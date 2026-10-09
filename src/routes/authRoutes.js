const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { loginLimiter, checkLoginAttempts } = require('../middlewares/rateLimit');

// Đăng nhập (có bảo vệ chống dò mật khẩu)
router.post('/login', loginLimiter, checkLoginAttempts, authController.login);

// Đăng xuất
router.post('/logout', authenticate, authController.logout);

// Lấy thông tin tài khoản hiện tại
router.get('/me', authenticate, authController.getMe);

// Đổi mật khẩu
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
