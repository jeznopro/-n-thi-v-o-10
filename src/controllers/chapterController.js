const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { cleanHtml } = require('../middlewares/sanitize');

/**
 * Lấy danh sách các chương học
 */
function getChapters(req, res, next) {
  try {
    const chapters = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.chapter_id = c.id) AS lesson_count
      FROM chapters c
      ORDER BY c.order_index ASC, c.id ASC
    `).all();

    return res.json({
      success: true,
      chapters
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy cấu trúc cây toàn bộ: Các chương cùng các bài học bên trong
 */
function getChaptersWithLessons(req, res, next) {
  try {
    const chapters = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.chapter_id = c.id) AS lesson_count
      FROM chapters c
      ORDER BY c.order_index ASC, c.id ASC
    `).all();

    const lessonStmt = db.prepare(`
      SELECT l.*, u.full_name AS author_name, cl.name AS class_name
      FROM lessons l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN classes cl ON l.class_id = cl.id
      WHERE l.chapter_id = ?
      ORDER BY l.order_index ASC, l.id ASC
    `);

    const result = chapters.map(ch => ({
      ...ch,
      lessons: lessonStmt.all(ch.id)
    }));

    // Lấy thêm các bài học chưa phân vào chương nào (nếu có)
    const unassignedLessons = db.prepare(`
      SELECT l.*, u.full_name AS author_name, cl.name AS class_name
      FROM lessons l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN classes cl ON l.class_id = cl.id
      WHERE l.chapter_id IS NULL
      ORDER BY l.id ASC
    `).all();

    return res.json({
      success: true,
      chapters: result,
      unassigned_lessons: unassignedLessons
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tạo chương học mới
 */
function createChapter(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { title, description, order_index, class_id } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên chương học.'
      });
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? description.trim() : '';
    const order = order_index ? parseInt(order_index, 10) : 0;

    const stmt = db.prepare(`
      INSERT INTO chapters (title, description, order_index, class_id, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanTitle,
      cleanDesc,
      order,
      class_id ? parseInt(class_id, 10) : null,
      teacherId
    );

    logAction({
      userId: teacherId,
      action: 'CREATE_CHAPTER',
      targetType: 'chapters',
      targetId: result.lastInsertRowid,
      ipAddress: req.ip,
      details: { title: cleanTitle }
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo chương học mới thành công!',
      chapterId: result.lastInsertRowid
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật chương học
 */
function updateChapter(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, order_index, class_id } = req.body;

    const existing = db.prepare('SELECT id FROM chapters WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chương học cần sửa.'
      });
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? description.trim() : '';
    const order = order_index !== undefined ? parseInt(order_index, 10) : 0;

    db.prepare(`
      UPDATE chapters
      SET title = ?, description = ?, order_index = ?, class_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      cleanTitle,
      cleanDesc,
      order,
      class_id ? parseInt(class_id, 10) : null,
      id
    );

    logAction({
      userId: req.user.id,
      action: 'UPDATE_CHAPTER',
      targetType: 'chapters',
      targetId: id,
      ipAddress: req.ip,
      details: { title: cleanTitle }
    });

    return res.json({
      success: true,
      message: 'Cập nhật chương học thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa chương học
 */
function deleteChapter(req, res, next) {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id, title FROM chapters WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chương học để xóa.'
      });
    }

    // Chuyển các bài học trong chương về chapter_id = NULL
    db.prepare('UPDATE lessons SET chapter_id = NULL WHERE chapter_id = ?').run(id);

    // Xóa chương
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);

    logAction({
      userId: req.user.id,
      action: 'DELETE_CHAPTER',
      targetType: 'chapters',
      targetId: id,
      ipAddress: req.ip,
      details: { title: existing.title }
    });

    return res.json({
      success: true,
      message: 'Đã xóa chương học thành công (các bài học đã được giữ lại).'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getChapters,
  getChaptersWithLessons,
  createChapter,
  updateChapter,
  deleteChapter
};
