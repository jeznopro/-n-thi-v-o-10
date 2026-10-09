const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { isLateSubmission, calculateRemainingSeconds } = require('../utils/timeHelper');
const { cleanHtml } = require('../middlewares/sanitize');
const fs = require('fs');
const path = require('path');

/**
 * Bắt đầu làm bài / Vào phòng thi
 */
function startExam(req, res, next) {
  try {
    const studentId = req.user.id;
    const assignmentId = req.params.assignmentId;

    // 1. Kiểm tra bài tập có tồn tại không
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập.'
      });
    }

    // 2. Kiểm tra học sinh có được giao bài không
    const target = db.prepare(`
      SELECT at.custom_content
      FROM assignment_targets at
      LEFT JOIN class_members cm ON at.target_type = 'class' AND at.target_id = cm.class_id
      WHERE at.assignment_id = ?
        AND ((at.target_type = 'student' AND at.target_id = ?) OR (at.target_type = 'class' AND cm.student_id = ?))
      LIMIT 1
    `).get(assignmentId, studentId, studentId);

    if (!target) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền làm bài tập này.'
      });
    }

    // 3. Tìm bài nộp lần gần nhất của học sinh
    let submission = db.prepare(`
      SELECT * FROM submissions
      WHERE assignment_id = ? AND student_id = ?
      ORDER BY attempt_number DESC LIMIT 1
    `).get(assignmentId, studentId);

    // Nếu chưa có bất kỳ submission nào -> Khởi tạo lượt 1
    if (!submission) {
      const resSub = db.prepare(`
        INSERT INTO submissions (assignment_id, student_id, content, word_count, status, started_at, attempt_number)
        VALUES (?, ?, '', 0, 'draft', CURRENT_TIMESTAMP, 1)
      `).run(assignmentId, studentId);

      submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(resSub.lastInsertRowid);
    }
    // Nếu giáo viên yêu cầu nộp lại (resubmission_requested) -> Tạo attempt tiếp theo
    else if (submission.status === 'resubmission_requested') {
      const nextAttempt = submission.attempt_number + 1;
      const resSub = db.prepare(`
        INSERT INTO submissions (assignment_id, student_id, content, word_count, status, started_at, attempt_number)
        VALUES (?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, ?)
      `).run(assignmentId, studentId, submission.content, submission.word_count, nextAttempt);

      submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(resSub.lastInsertRowid);
    }

    // 4. Tính toán thời gian còn lại (nếu có giới hạn thời gian)
    let remainingSeconds = null;
    let isTimeOver = false;

    if (assignment.time_limit_minutes) {
      remainingSeconds = calculateRemainingSeconds(submission.started_at, assignment.time_limit_minutes);
      if (remainingSeconds <= 0 && submission.status === 'draft') {
        isTimeOver = true;
      }
    }

    // 5. Lấy danh sách tệp đính kèm của bài làm
    const attachments = db.prepare(`
      SELECT * FROM attachments
      WHERE entity_type = 'submission' AND entity_id = ?
    `).all(submission.id);

    // Tiêu chí chấm (Rubric) để học sinh nắm rõ yêu cầu
    const rubrics = db.prepare('SELECT * FROM rubrics WHERE assignment_id = ? ORDER BY order_index ASC').all(assignmentId);

    return res.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        content: target.custom_content || assignment.content,
        max_score: assignment.max_score,
        time_limit_minutes: assignment.time_limit_minutes,
        due_date: assignment.due_date,
        allow_resubmit: assignment.allow_resubmit,
        rubrics
      },
      submission: {
        ...submission,
        remaining_seconds: remainingSeconds,
        is_time_over: isTimeOver,
        attachments
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tự động lưu nháp (mỗi 30s hoặc khi gõ)
 */
function autoSaveDraft(req, res, next) {
  try {
    const studentId = req.user.id;
    const { submission_id, content, word_count = 0 } = req.body;

    if (!submission_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã bài làm (submission_id).'
      });
    }

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND student_id = ?').get(submission_id, studentId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài làm.'
      });
    }

    if (submission.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Bài làm đã nộp hoặc đã được chấm điểm, không thể tiếp tục lưu nháp.'
      });
    }

    const cleanContent = cleanHtml(content || '');

    db.prepare(`
      UPDATE submissions
      SET content = ?, word_count = ?, auto_saved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanContent, parseInt(word_count, 10) || 0, submission_id);

    return res.json({
      success: true,
      message: 'Đã tự động lưu nháp thành công.',
      savedAt: new Date().toLocaleTimeString('vi-VN')
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Nộp bài chính thức
 */
function submitEssay(req, res, next) {
  try {
    const studentId = req.user.id;
    const { submission_id, content, word_count = 0 } = req.body;

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND student_id = ?').get(submission_id, studentId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài làm.'
      });
    }

    if (submission.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Bài làm này đã được nộp trước đó.'
      });
    }

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(submission.assignment_id);
    const cleanContent = cleanHtml(content || submission.content);

    // Kiểm tra nộp trễ so với due_date
    const isLate = isLateSubmission(assignment.due_date);

    db.prepare(`
      UPDATE submissions
      SET content = ?, word_count = ?, status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP, is_late = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanContent, parseInt(word_count, 10) || 0, isLate ? 1 : 0, submission_id);

    logAction({
      userId: studentId,
      action: 'SUBMIT_ESSAY',
      targetType: 'submissions',
      targetId: submission_id,
      ipAddress: req.ip,
      details: {
        assignment_id: assignment.id,
        is_late: isLate,
        word_count
      }
    });

    return res.json({
      success: true,
      message: isLate ? 'Đã nộp bài thành công (Ghi nhận nộp trễ hạn).' : 'Đã nộp bài thành công đúng hạn!',
      is_late: isLate
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tải file / ảnh bài giải viết tay lên bài làm
 */
function uploadSubmissionAttachment(req, res, next) {
  try {
    const studentId = req.user.id;
    const { submission_id } = req.body;
    const qIndex = parseInt(req.body.question_index, 10) || 1;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn tệp hoặc ảnh chụp bài làm để tải lên.'
      });
    }

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND student_id = ?').get(submission_id, studentId);
    if (!submission) {
      // Xóa file vừa upload nếu không tìm thấy bài làm
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài làm.'
      });
    }

    if (submission.status !== 'draft') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Bài làm đã nộp, không thể thêm tệp đính kèm.'
      });
    }

    const relPath = '/uploads/submissions/' + req.file.filename;

    const result = db.prepare(`
      INSERT INTO attachments (entity_type, entity_id, question_index, file_name, file_path, file_size, mime_type, uploaded_by)
      VALUES ('submission', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submission.id,
      qIndex,
      req.file.originalname,
      relPath,
      req.file.size,
      req.file.mimetype,
      studentId
    );

    return res.json({
      success: true,
      message: 'Tải tệp đính kèm thành công!',
      attachment: {
        id: result.lastInsertRowid,
        question_index: qIndex,
        file_name: req.file.originalname,
        file_path: relPath,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa tệp đính kèm bài làm
 */
function deleteSubmissionAttachment(req, res, next) {
  try {
    const studentId = req.user.id;
    const { attachmentId } = req.params;

    const attachment = db.prepare(`
      SELECT a.*, s.status FROM attachments a
      JOIN submissions s ON a.entity_id = s.id AND a.entity_type = 'submission'
      WHERE a.id = ? AND a.uploaded_by = ?
    `).get(attachmentId, studentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tệp đính kèm.'
      });
    }

    if (attachment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Bài làm đã nộp, không thể xóa tệp đính kèm.'
      });
    }

    // Xóa file trên ổ cứng
    const fullDiskPath = path.join(__dirname, '../../', attachment.file_path);
    if (fs.existsSync(fullDiskPath)) {
      fs.unlinkSync(fullDiskPath);
    }

    db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId);

    return res.json({
      success: true,
      message: 'Đã xóa tệp đính kèm thành công.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startExam,
  autoSaveDraft,
  submitEssay,
  uploadSubmissionAttachment,
  deleteSubmissionAttachment
};
