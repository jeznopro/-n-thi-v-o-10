const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const { logAction } = require('../utils/logger');

/**
 * Tải bản sao lưu toàn bộ dữ liệu hệ thống (JSON hoặc SQLite)
 */
function downloadBackup(req, res, next) {
  try {
    const { format } = req.query;
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');

    if (format === 'sqlite') {
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ success: false, message: 'Tệp CSDL SQLite không tồn tại.' });
      }
      res.setHeader('Content-Disposition', `attachment; filename="database-backup-${Date.now()}.sqlite"`);
      res.setHeader('Content-Type', 'application/x-sqlite3');
      return res.sendFile(path.resolve(dbPath));
    }

    // Mặc định xuất dạng JSON đầy đủ mọi bảng
    const tables = [
      'users', 'classes', 'class_members', 'assignments',
      'assignment_targets', 'rubrics', 'submissions', 'grades',
      'chapters', 'lessons'
    ];

    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      system: 'Hệ thống Ôn thi vào 10 môn Toán',
      data: {}
    };

    tables.forEach(table => {
      try {
        backupData.data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch (e) {
        backupData.data[table] = [];
      }
    });

    logAction({
      userId: req.user.id,
      action: 'EXPORT_BACKUP',
      targetType: 'system',
      targetId: null,
      ipAddress: req.ip,
      details: { format: 'json', tablesCount: tables.length }
    });

    const fileName = `backup-math10-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
}

/**
 * Khôi phục dữ liệu từ bản sao lưu JSON
 */
function restoreBackup(req, res, next) {
  try {
    const backup = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu sao lưu không đúng định dạng chuẩn.'
      });
    }

    const { data } = backup;
    const teacherId = req.user.id;

    const restoreTx = db.transaction(() => {
      // 1. Phục hồi users (giữ nguyên hoặc chèn mới)
      if (Array.isArray(data.users)) {
        const stmtUser = db.prepare(`
          INSERT OR REPLACE INTO users (id, username, password_hash, full_name, role, status, must_change_password)
          VALUES (@id, @username, @password_hash, @full_name, @role, @status, @must_change_password)
        `);
        data.users.forEach(u => stmtUser.run(u));
      }

      // 2. Phục hồi classes
      if (Array.isArray(data.classes)) {
        const stmtClass = db.prepare(`
          INSERT OR REPLACE INTO classes (id, name, code, description, created_by)
          VALUES (@id, @name, @code, @description, @created_by)
        `);
        data.classes.forEach(c => stmtClass.run(c));
      }

      // 3. Phục hồi class_members
      if (Array.isArray(data.class_members)) {
        const stmtMember = db.prepare(`
          INSERT OR REPLACE INTO class_members (id, class_id, student_id)
          VALUES (@id, @class_id, @student_id)
        `);
        data.class_members.forEach(m => stmtMember.run(m));
      }

      // 4. Phục hồi assignments
      if (Array.isArray(data.assignments)) {
        const stmtAssign = db.prepare(`
          INSERT OR REPLACE INTO assignments (id, title, content, max_score, time_limit_minutes, due_date, allow_resubmit, created_by)
          VALUES (@id, @title, @content, @max_score, @time_limit_minutes, @due_date, @allow_resubmit, @created_by)
        `);
        data.assignments.forEach(a => stmtAssign.run(a));
      }

      // 5. Phục hồi assignment_targets
      if (Array.isArray(data.assignment_targets)) {
        const stmtTarget = db.prepare(`
          INSERT OR REPLACE INTO assignment_targets (id, assignment_id, target_type, target_id, custom_content)
          VALUES (@id, @assignment_id, @target_type, @target_id, @custom_content)
        `);
        data.assignment_targets.forEach(t => stmtTarget.run(t));
      }

      // 6. Phục hồi rubrics
      if (Array.isArray(data.rubrics)) {
        const stmtRubric = db.prepare(`
          INSERT OR REPLACE INTO rubrics (id, assignment_id, criteria_name, description, max_score, order_index)
          VALUES (@id, @assignment_id, @criteria_name, @description, @max_score, @order_index)
        `);
        data.rubrics.forEach(r => stmtRubric.run(r));
      }

      // 7. Phục hồi submissions
      if (Array.isArray(data.submissions)) {
        const stmtSub = db.prepare(`
          INSERT OR REPLACE INTO submissions (id, assignment_id, student_id, content, word_count, status, started_at, submitted_at, is_late, attempt_number)
          VALUES (@id, @assignment_id, @student_id, @content, @word_count, @status, @started_at, @submitted_at, @is_late, @attempt_number)
        `);
        data.submissions.forEach(s => stmtSub.run(s));
      }

      // 8. Phục hồi grades
      if (Array.isArray(data.grades)) {
        const stmtGrade = db.prepare(`
          INSERT OR REPLACE INTO grades (id, submission_id, teacher_id, total_score, feedback, rubric_breakdown)
          VALUES (@id, @submission_id, @teacher_id, @total_score, @feedback, @rubric_breakdown)
        `);
        data.grades.forEach(g => stmtGrade.run(g));
      }

      // 9. Phục hồi chapters
      if (Array.isArray(data.chapters)) {
        const stmtChapter = db.prepare(`
          INSERT OR REPLACE INTO chapters (id, title, description, order_index, class_id, created_by)
          VALUES (@id, @title, @description, @order_index, @class_id, @created_by)
        `);
        data.chapters.forEach(c => stmtChapter.run(c));
      }

      // 10. Phục hồi lessons
      if (Array.isArray(data.lessons)) {
        const stmtLesson = db.prepare(`
          INSERT OR REPLACE INTO lessons (id, title, category, summary, content, key_formulas, video_url, document_url, class_id, chapter_id, order_index, attachment_url, created_by)
          VALUES (@id, @title, @category, @summary, @content, @key_formulas, @video_url, @document_url, @class_id, @chapter_id, @order_index, @attachment_url, @created_by)
        `);
        data.lessons.forEach(l => stmtLesson.run(l));
      }
    });

    restoreTx();

    logAction({
      userId: teacherId,
      action: 'RESTORE_BACKUP',
      targetType: 'system',
      targetId: null,
      ipAddress: req.ip,
      details: { message: 'Khôi phục toàn bộ CSDL từ file sao lưu thành công' }
    });

    return res.json({
      success: true,
      message: 'Khôi phục toàn bộ dữ liệu hệ thống thành công!'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  downloadBackup,
  restoreBackup
};
