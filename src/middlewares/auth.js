const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { ROLES, USER_STATUS } = require('../config/constants');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'essay_system_secure_jwt_secret_key_2026_antigravity';

/**
 * Xác thực phiên đăng nhập người dùng từ Cookie hoặc Header
 */
function authenticate(req, res, next) {
  let token = null;

  // 1. Kiểm tra trong HttpOnly Cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Hoặc kiểm tra trong Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Kiểm tra trạng thái người dùng trong database
    const user = db.prepare(`
      SELECT id, username, full_name, role, status, must_change_password
      FROM users WHERE id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống.'
      });
    }

    if (user.status === USER_STATUS.LOCKED) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ giáo viên quản trị.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
    });
  }
}

/**
 * Phân quyền dành riêng cho Giáo viên
 */
function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== ROLES.TEACHER) {
    return res.status(403).json({
      success: false,
      message: 'Truy cập bị từ chối! Chức năng này chỉ dành cho Giáo viên.'
    });
  }
  next();
}

/**
 * Phân quyền dành riêng cho Học sinh
 */
function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== ROLES.STUDENT) {
    return res.status(403).json({
      success: false,
      message: 'Truy cập bị từ chối! Chức năng này chỉ dành cho Học sinh.'
    });
  }
  next();
}

/**
 * Kiểm tra xem người dùng có bị bắt buộc đổi mật khẩu hay không
 */
function checkMustChangePassword(req, res, next) {
  if (req.user && req.user.must_change_password === 1) {
    // Chỉ cho phép gọi API đổi mật khẩu, xem thông tin cá nhân và đăng xuất
    const allowedPaths = ['/api/auth/change-password', '/api/auth/me', '/api/auth/logout'];
    if (!allowedPaths.includes(req.originalUrl.split('?')[0])) {
      return res.status(403).json({
        success: false,
        code: 'MUST_CHANGE_PASSWORD',
        message: 'Bạn phải đổi mật khẩu mặc định trước khi có thể sử dụng các chức năng khác.'
      });
    }
  }
  next();
}

module.exports = {
  authenticate,
  requireTeacher,
  requireStudent,
  checkMustChangePassword
};
