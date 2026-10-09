const rateLimit = require('express-rate-limit');
const db = require('../database/db');

// Giới hạn chung cho toàn bộ API (ngăn chặn DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 300, // Tối đa 300 request trên mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu đến hệ thống. Vui lòng thử lại sau ít phút.'
  }
});

// Giới hạn cho đăng nhập bằng express-rate-limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 lần thử trên 1 IP
  message: {
    success: false,
    message: 'Phát hiện quá nhiều lần đăng nhập từ địa chỉ mạng của bạn. Vui lòng thử lại sau 15 phút.'
  }
});

/**
 * Kiểm tra và xử lý số lần đăng nhập sai theo từng tài khoản
 * Khóa 15 phút nếu nhập sai quá 5 lần liên tiếp
 */
function checkLoginAttempts(req, res, next) {
  const username = (req.body.username || '').trim().toLowerCase();
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

  if (!username) return next();

  const record = db.prepare(`
    SELECT failed_count, lock_until FROM login_attempts
    WHERE username = ? AND ip_address = ?
  `).get(username, ip);

  if (record && record.lock_until) {
    const lockUntilMs = new Date(record.lock_until).getTime();
    const nowMs = Date.now();

    if (nowMs < lockUntilMs) {
      const waitMinutes = Math.ceil((lockUntilMs - nowMs) / 60000);
      return res.status(429).json({
        success: false,
        message: `Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${waitMinutes} phút.`
      });
    } else {
      // Hết hạn khóa -> reset
      db.prepare(`
        DELETE FROM login_attempts WHERE username = ? AND ip_address = ?
      `).run(username, ip);
    }
  }

  next();
}

/**
 * Ghi nhận một lần đăng nhập sai
 */
function recordFailedLogin(username, ip) {
  const normUser = username.trim().toLowerCase();
  const record = db.prepare(`
    SELECT id, failed_count FROM login_attempts
    WHERE username = ? AND ip_address = ?
  `).get(normUser, ip);

  const now = new Date();

  if (record) {
    const newCount = record.failed_count + 1;
    let lockUntil = null;
    if (newCount >= 5) {
      // Khóa 15 phút
      lockUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    }

    db.prepare(`
      UPDATE login_attempts
      SET failed_count = ?, lock_until = ?, last_attempt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newCount, lockUntil, record.id);
  } else {
    db.prepare(`
      INSERT INTO login_attempts (username, ip_address, failed_count, last_attempt)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    `).run(normUser, ip);
  }
}

/**
 * Xóa lịch sử đăng nhập sai khi đăng nhập thành công
 */
function resetFailedLogin(username, ip) {
  const normUser = username.trim().toLowerCase();
  db.prepare(`
    DELETE FROM login_attempts WHERE username = ? AND ip_address = ?
  `).run(normUser, ip);
}

module.exports = {
  apiLimiter,
  loginLimiter,
  checkLoginAttempts,
  recordFailedLogin,
  resetFailedLogin
};
