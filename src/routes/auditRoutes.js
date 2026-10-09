const express = require('express');
const router = express.Router();
const db = require('../database/db');
const teacherController = require('../controllers/teacherController');
const { authenticate, requireTeacher } = require('../middlewares/auth');

router.use(authenticate, requireTeacher);

// Thống kê dashboard giáo viên
router.get('/dashboard-stats', teacherController.getDashboardStats);

// Lấy danh sách nhật ký kiểm toán (Audit logs)
router.get('/logs', (req, res, next) => {
  try {
    const { action, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT al.*, u.full_name, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params = [];

    if (action) {
      query += ` WHERE al.action = ?`;
      params.push(action);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const logs = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) AS count FROM audit_logs').get().count;

    return res.json({
      success: true,
      logs,
      totalCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
