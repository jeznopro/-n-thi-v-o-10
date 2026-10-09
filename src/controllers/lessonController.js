const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { cleanHtml } = require('../middlewares/sanitize');

/**
 * Lấy danh sách tất cả bài giảng lý thuyết
 */
function getAllLessons(req, res, next) {
  try {
    const { category, chapter_id, search } = req.query;
    const user = req.user;

    let sql = `
      SELECT l.*, u.full_name AS author_name, c.name AS class_name, ch.title AS chapter_title
      FROM lessons l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN classes c ON l.class_id = c.id
      LEFT JOIN chapters ch ON l.chapter_id = ch.id
      WHERE 1=1
    `;
    const params = [];

    // Nếu là học sinh: chỉ xem bài giảng công khai hoặc của lớp mình học
    if (user && user.role === 'student') {
      sql += ` AND (l.class_id IS NULL OR l.class_id IN (
        SELECT class_id FROM class_members WHERE student_id = ?
      ))`;
      params.push(user.id);
    }

    if (category && category !== 'all') {
      sql += ` AND l.category = ?`;
      params.push(category);
    }

    if (chapter_id) {
      if (chapter_id === 'unassigned') {
        sql += ` AND l.chapter_id IS NULL`;
      } else {
        sql += ` AND l.chapter_id = ?`;
        params.push(parseInt(chapter_id, 10));
      }
    }

    if (search && search.trim()) {
      sql += ` AND (l.title LIKE ? OR l.summary LIKE ? OR l.content LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY ch.order_index ASC, l.order_index ASC, l.id ASC`;

    const lessons = db.prepare(sql).all(...params);

    return res.json({
      success: true,
      lessons
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy chi tiết một bài giảng lý thuyết
 */
function getLessonById(req, res, next) {
  try {
    const { id } = req.params;
    const lesson = db.prepare(`
      SELECT l.*, u.full_name AS author_name, c.name AS class_name, ch.title AS chapter_title
      FROM lessons l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN classes c ON l.class_id = c.id
      LEFT JOIN chapters ch ON l.chapter_id = ch.id
      WHERE l.id = ?
    `).get(id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài giảng lý thuyết này.'
      });
    }

    return res.json({
      success: true,
      lesson
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Giáo viên tạo bài giảng lý thuyết mới
 */
function createLesson(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { title, category, summary, content, key_formulas, class_id, chapter_id, order_index, attachment_url, video_url, document_url } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tiêu đề bài giảng lý thuyết.'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung bài giảng.'
      });
    }

    const cleanContent = cleanHtml(content);
    const cleanFormulas = key_formulas ? cleanHtml(key_formulas) : null;
    const cleanSummary = summary ? summary.trim() : '';

    const stmt = db.prepare(`
      INSERT INTO lessons (title, category, summary, content, key_formulas, video_url, document_url, class_id, chapter_id, order_index, attachment_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title.trim(),
      category || 'Đại số',
      cleanSummary,
      cleanContent,
      cleanFormulas,
      video_url ? video_url.trim() : null,
      document_url ? document_url.trim() : null,
      class_id ? parseInt(class_id, 10) : null,
      chapter_id ? parseInt(chapter_id, 10) : null,
      order_index !== undefined && order_index !== null ? parseInt(order_index, 10) : 0,
      attachment_url || null,
      teacherId
    );

    logAction({
      userId: teacherId,
      action: 'CREATE_LESSON',
      targetType: 'lessons',
      targetId: result.lastInsertRowid,
      ipAddress: req.ip,
      details: { title: title.trim(), category: category || 'Đại số', chapter_id }
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo bài giảng lý thuyết thành công!',
      lessonId: result.lastInsertRowid
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Giáo viên cập nhật bài giảng lý thuyết
 */
function updateLesson(req, res, next) {
  try {
    const { id } = req.params;
    const { title, category, summary, content, key_formulas, video_url, document_url, class_id, chapter_id, order_index, attachment_url } = req.body;

    const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài giảng để chỉnh sửa.'
      });
    }

    const cleanContent = cleanHtml(content);
    const cleanFormulas = key_formulas ? cleanHtml(key_formulas) : null;
    const cleanSummary = summary ? summary.trim() : '';

    db.prepare(`
      UPDATE lessons
      SET title = ?, category = ?, summary = ?, content = ?, key_formulas = ?,
          video_url = ?, document_url = ?, class_id = ?, chapter_id = ?, order_index = ?,
          attachment_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      category || 'Đại số',
      cleanSummary,
      cleanContent,
      cleanFormulas,
      video_url ? video_url.trim() : null,
      document_url ? document_url.trim() : null,
      class_id ? parseInt(class_id, 10) : null,
      chapter_id ? parseInt(chapter_id, 10) : null,
      order_index !== undefined && order_index !== null ? parseInt(order_index, 10) : 0,
      attachment_url || null,
      id
    );

    logAction({
      userId: req.user.id,
      action: 'UPDATE_LESSON',
      targetType: 'lessons',
      targetId: id,
      ipAddress: req.ip,
      details: { title: title.trim(), chapter_id }
    });

    return res.json({
      success: true,
      message: 'Cập nhật bài giảng lý thuyết thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Giáo viên xóa bài giảng lý thuyết
 */
function deleteLesson(req, res, next) {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id, title FROM lessons WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài giảng để xóa.'
      });
    }

    db.prepare('DELETE FROM lessons WHERE id = ?').run(id);

    logAction({
      userId: req.user.id,
      action: 'DELETE_LESSON',
      targetType: 'lessons',
      targetId: id,
      ipAddress: req.ip,
      details: { title: existing.title }
    });

    return res.json({
      success: true,
      message: 'Đã xóa bài giảng lý thuyết.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson
};
