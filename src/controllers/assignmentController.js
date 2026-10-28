const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { cleanHtml } = require('../middlewares/sanitize');
const { parseWordFile } = require('../utils/wordParser');

/**
 * Lấy danh sách bài tập dành cho Giáo viên
 */
function getTeacherAssignments(req, res, next) {
  try {
    const assignments = db.prepare(`
      SELECT a.*,
        c.title AS chapter_title,
        c.order_index AS chapter_order,
        (SELECT COUNT(DISTINCT CASE WHEN target_type = 'student' THEN target_id
                                    ELSE cm.student_id END)
         FROM assignment_targets at
         LEFT JOIN class_members cm ON at.target_type = 'class' AND at.target_id = cm.class_id
         WHERE at.assignment_id = a.id
        ) AS total_assigned_students,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status != 'draft') AS total_submitted,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') AS total_graded
      FROM assignments a
      LEFT JOIN chapters c ON a.chapter_id = c.id
      ORDER BY COALESCE(c.order_index, 999) ASC, a.created_at DESC
    `).all();

    return res.json({
      success: true,
      assignments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách bài tập dành cho Học sinh
 */
function getStudentAssignments(req, res, next) {
  try {
    const studentId = req.user.id;
    const { status } = req.query; // filter: not_started, in_progress, submitted, graded

    // Tìm các bài tập được giao trực tiếp cho học sinh hoặc giao cho lớp mà học sinh tham gia
    const query = `
      SELECT DISTINCT a.id, a.title, a.max_score, a.time_limit_minutes, a.due_date, a.allow_resubmit, a.created_at,
             a.chapter_id, c.title AS chapter_title, c.order_index AS chapter_order,
             s.id AS submission_id, s.status AS submission_status, s.started_at, s.submitted_at, s.is_late,
             s.attempt_number, g.total_score AS grade_score, g.feedback AS teacher_feedback,
             at.custom_content IS NOT NULL AS has_custom_content
      FROM assignments a
      LEFT JOIN chapters c ON a.chapter_id = c.id
      JOIN assignment_targets at ON a.id = at.assignment_id
      LEFT JOIN class_members cm ON at.target_type = 'class' AND at.target_id = cm.class_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
           AND s.attempt_number = (SELECT MAX(attempt_number) FROM submissions WHERE assignment_id = a.id AND student_id = ?)
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE (at.target_type = 'student' AND at.target_id = ?)
         OR (at.target_type = 'class' AND cm.student_id = ?)
      ORDER BY COALESCE(c.order_index, 999) ASC, a.due_date ASC
    `;

    let assignments = db.prepare(query).all(studentId, studentId, studentId, studentId);

    // Tính trạng thái chuẩn hóa
    assignments = assignments.map(a => {
      let currentStatus = 'not_started';
      if (a.submission_status === 'draft') {
        currentStatus = 'in_progress';
      } else if (a.submission_status === 'submitted') {
        currentStatus = 'submitted';
      } else if (a.submission_status === 'graded') {
        currentStatus = 'graded';
      } else if (a.submission_status === 'resubmission_requested') {
        currentStatus = 'resubmission_requested';
      }

      const isLate = a.due_date ? (new Date() > new Date(a.due_date) && currentStatus !== 'submitted' && currentStatus !== 'graded') : false;

      return {
        ...a,
        computed_status: currentStatus,
        is_past_due: isLate
      };
    });

    // Lọc theo trạng thái nếu client yêu cầu
    if (status) {
      assignments = assignments.filter(a => a.computed_status === status);
    }

    return res.json({
      success: true,
      assignments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy chi tiết một bài tập (theo ID)
 */
function getAssignmentById(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập.'
      });
    }

    // Tiêu chí chấm điểm (Rubric)
    const rubrics = db.prepare('SELECT * FROM rubrics WHERE assignment_id = ? ORDER BY order_index ASC').all(id);

    // Tệp đính kèm đề bài
    const attachments = db.prepare(`
      SELECT * FROM attachments
      WHERE entity_type = 'assignment' AND entity_id = ?
    `).all(id);

    // Nếu là học sinh, kiểm tra quyền và lấy nội dung đề riêng (nếu có)
    let studentContent = assignment.content;
    let submissionInfo = null;

    if (user.role === 'student') {
      const target = db.prepare(`
        SELECT at.custom_content
        FROM assignment_targets at
        LEFT JOIN class_members cm ON at.target_type = 'class' AND at.target_id = cm.class_id
        WHERE at.assignment_id = ?
          AND ((at.target_type = 'student' AND at.target_id = ?) OR (at.target_type = 'class' AND cm.student_id = ?))
        LIMIT 1
      `).get(id, user.id, user.id);

      if (!target) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không được giao bài tập này.'
        });
      }

      if (target.custom_content) {
        studentContent = target.custom_content;
      }

      submissionInfo = db.prepare(`
        SELECT s.*, g.total_score, g.feedback, g.rubric_breakdown
        FROM submissions s
        LEFT JOIN grades g ON s.id = g.submission_id
        WHERE s.assignment_id = ? AND s.student_id = ?
        ORDER BY s.attempt_number DESC LIMIT 1
      `).get(id, user.id);
    }

    // Đối tượng được giao (dành cho Giáo viên)
    let targets = [];
    if (user.role === 'teacher') {
      targets = db.prepare('SELECT * FROM assignment_targets WHERE assignment_id = ?').all(id);
    }

    return res.json({
      success: true,
      assignment: {
        ...assignment,
        content: studentContent,
        rubrics,
        attachments,
        targets,
        submission: submissionInfo
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tạo bài tập mới (Giáo viên)
 */
function createAssignment(req, res, next) {
  try {
    const {
      title,
      content,
      max_score = 10.0,
      time_limit_minutes = null,
      due_date,
      allow_resubmit = 0,
      chapter_id = null,
      targets = [], // [{ type: 'class'|'student', id: 1, custom_content?: '' }]
      rubrics = []  // [{ criteria_name: '', description: '', max_score: 2.0 }]
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và nội dung đề bài là bắt buộc.'
      });
    }

    const cleanContent = cleanHtml(content);
    const dueDateVal = due_date && String(due_date).trim() ? String(due_date).trim() : null;

    const tx = db.transaction(() => {
      const resAssign = db.prepare(`
        INSERT INTO assignments (title, content, max_score, time_limit_minutes, due_date, allow_resubmit, chapter_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title.trim(),
        cleanContent,
        parseFloat(max_score) || 10.0,
        time_limit_minutes ? parseInt(time_limit_minutes, 10) : null,
        dueDateVal,
        allow_resubmit ? 1 : 0,
        chapter_id ? parseInt(chapter_id, 10) : null,
        req.user.id
      );

      const assignmentId = resAssign.lastInsertRowid;

      // 1. Lưu các đối tượng được giao bài
      const insertTargetStmt = db.prepare(`
        INSERT INTO assignment_targets (assignment_id, target_type, target_id, custom_content)
        VALUES (?, ?, ?, ?)
      `);

      const targetList = Array.isArray(targets) ? targets : JSON.parse(targets || '[]');
      for (const t of targetList) {
        insertTargetStmt.run(
          assignmentId,
          t.type,
          parseInt(t.id, 10),
          t.custom_content ? cleanHtml(t.custom_content) : null
        );
      }

      // 2. Lưu tiêu chí Rubric
      const insertRubricStmt = db.prepare(`
        INSERT INTO rubrics (assignment_id, criteria_name, description, max_score, order_index)
        VALUES (?, ?, ?, ?, ?)
      `);

      const rubricList = Array.isArray(rubrics) ? rubrics : JSON.parse(rubrics || '[]');
      rubricList.forEach((r, idx) => {
        insertRubricStmt.run(
          assignmentId,
          r.criteria_name.trim(),
          r.description ? r.description.trim() : null,
          parseFloat(r.max_score) || 0,
          idx + 1
        );
      });

      // 3. Xử lý file đính kèm nếu có upload
      if (req.files && req.files.length > 0) {
        const insertAttStmt = db.prepare(`
          INSERT INTO attachments (entity_type, entity_id, file_name, file_path, file_size, mime_type, uploaded_by)
          VALUES ('assignment', ?, ?, ?, ?, ?, ?)
        `);

        for (const file of req.files) {
          const relPath = '/uploads/assignments/' + file.filename;
          insertAttStmt.run(
            assignmentId,
            file.originalname,
            relPath,
            file.size,
            file.mimetype,
            req.user.id
          );
        }
      }

      logAction({
        userId: req.user.id,
        action: 'CREATE_ASSIGNMENT',
        targetType: 'assignments',
        targetId: assignmentId,
        ipAddress: req.ip,
        details: { title, target_count: targetList.length, rubric_count: rubricList.length }
      });

      return assignmentId;
    });

    const createdId = tx();

    return res.json({
      success: true,
      message: 'Tạo bài tập tự luận thành công!',
      assignmentId: createdId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa bài tập
 */
function deleteAssignment(req, res, next) {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM assignments WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập.'
      });
    }

    logAction({
      userId: req.user.id,
      action: 'DELETE_ASSIGNMENT',
      targetType: 'assignments',
      targetId: id,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: 'Đã xóa bài tập thành công.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật bài tập (Giáo viên)
 */
function updateAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      max_score,
      time_limit_minutes,
      due_date,
      allow_resubmit,
      chapter_id,
      targets,
      rubrics
    } = req.body;

    const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập.' });
    }

    const titleVal = title !== undefined && title.trim() ? title.trim() : existing.title;
    const contentVal = content !== undefined ? cleanHtml(content) : existing.content;
    const maxScoreVal = max_score !== undefined ? (parseFloat(max_score) || 10.0) : existing.max_score;
    
    // Xử lý time_limit_minutes: nếu truyền chuỗi rỗng hoặc null => xóa thời gian giới hạn (thành không giới hạn)
    let timeLimitVal = existing.time_limit_minutes;
    if (time_limit_minutes !== undefined) {
      timeLimitVal = (time_limit_minutes && String(time_limit_minutes).trim() !== '') ? parseInt(time_limit_minutes, 10) : null;
    }

    // Xử lý due_date: nếu truyền chuỗi rỗng hoặc null => xóa hạn nộp (thành vô thời hạn)
    let dueDateVal = existing.due_date;
    if (due_date !== undefined) {
      dueDateVal = (due_date && String(due_date).trim() !== '') ? String(due_date).trim() : null;
    }

    let allowResubmitVal = existing.allow_resubmit;
    if (allow_resubmit !== undefined) {
      allowResubmitVal = allow_resubmit ? 1 : 0;
    }

    let chapterIdVal = existing.chapter_id;
    if (chapter_id !== undefined) {
      chapterIdVal = (chapter_id && String(chapter_id).trim() !== '') ? parseInt(chapter_id, 10) : null;
    }

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE assignments
        SET title = ?,
            content = ?,
            max_score = ?,
            time_limit_minutes = ?,
            due_date = ?,
            allow_resubmit = ?,
            chapter_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        titleVal,
        contentVal,
        maxScoreVal,
        timeLimitVal,
        dueDateVal,
        allowResubmitVal,
        chapterIdVal,
        id
      );

      // Cập nhật targets nếu được gửi lên
      if (targets !== undefined) {
        db.prepare('DELETE FROM assignment_targets WHERE assignment_id = ?').run(id);
        const insertTargetStmt = db.prepare(`
          INSERT INTO assignment_targets (assignment_id, target_type, target_id, custom_content)
          VALUES (?, ?, ?, ?)
        `);
        const targetList = Array.isArray(targets) ? targets : JSON.parse(targets || '[]');
        for (const t of targetList) {
          insertTargetStmt.run(
            id,
            t.type,
            parseInt(t.id, 10),
            t.custom_content ? cleanHtml(t.custom_content) : null
          );
        }
      }

      // Cập nhật rubrics nếu được gửi lên
      if (rubrics !== undefined) {
        db.prepare('DELETE FROM rubrics WHERE assignment_id = ?').run(id);
        const insertRubricStmt = db.prepare(`
          INSERT INTO rubrics (assignment_id, criteria_name, description, max_score, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);
        const rubricList = Array.isArray(rubrics) ? rubrics : JSON.parse(rubrics || '[]');
        rubricList.forEach((r, idx) => {
          insertRubricStmt.run(
            id,
            r.criteria_name.trim(),
            r.description ? r.description.trim() : null,
            parseFloat(r.max_score) || 0,
            idx + 1
          );
        });
      }

      logAction({
        userId: req.user.id,
        action: 'UPDATE_ASSIGNMENT',
        targetType: 'assignments',
        targetId: id,
        ipAddress: req.ip,
        details: { title: titleVal, chapter_id: chapterIdVal, due_date: dueDateVal, time_limit_minutes: timeLimitVal }
      });
    });

    tx();

    return res.json({ success: true, message: 'Cập nhật bài tập thành công!' });
  } catch (error) {
    next(error);
  }
}

/**
 * Nhập đề thi từ file Word (.docx)
 */
async function importFromWord(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file Word (.docx) để tải lên.'
      });
    }

    const parsed = await parseWordFile(req.file.path, req.file.originalname);

    logAction({
      userId: req.user.id,
      action: 'IMPORT_ASSIGNMENT_WORD',
      targetType: 'assignments',
      ipAddress: req.ip,
      details: {
        filename: req.file.originalname,
        questionsCount: parsed.questions.length
      }
    });

    return res.json({
      success: true,
      message: `Đã phân tích thành công ${parsed.questions.length} câu hỏi từ file Word.`,
      data: parsed
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTeacherAssignments,
  getStudentAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  importFromWord
};
