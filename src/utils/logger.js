const db = require('../database/db');

/**
 * Ghi nhật ký hành động hệ thống (Audit log)
 * @param {Object} params
 * @param {number|null} params.userId ID người dùng thực hiện
 * @param {string} params.action Tên hành động (CREATE_ASSIGNMENT, GRADE, RESET_PWD...)
 * @param {string} [params.targetType] Loại đối tượng (user, assignment, submission...)
 * @param {number} [params.targetId] ID đối tượng bị tác động
 * @param {string} [params.ipAddress] Địa chỉ IP client
 * @param {Object} [params.details] Dữ liệu chi tiết dạng object
 */
function logAction({ userId = null, action, targetType = null, targetId = null, ipAddress = null, details = null }) {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, action, targetType, targetId, ipAddress, detailsJson);
  } catch (error) {
    console.error('Lỗi ghi audit log:', error.message);
  }
}

module.exports = {
  logAction
};
