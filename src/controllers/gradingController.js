const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { exportGradebookToExcel } = require('../utils/excelHelper');
const { cleanHtml } = require('../middlewares/sanitize');

/**
 * Lấy danh sách nộp bài của một bài tập (Giáo viên)
 */
function getSubmissionsByAssignment(req, res, next) {
  try {
    const { assignmentId } = req.params;
    const { status } = req.query; // all, submitted, graded, not_submitted, late

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập.'
      });
    }

    // 1. Lấy danh sách tất cả học sinh được giao bài này
    const assignedStudents = db.prepare(`
      SELECT DISTINCT u.id AS student_id, u.username, u.full_name, c.name AS class_name
      FROM users u
      LEFT JOIN class_members cm ON u.id = cm.student_id
      LEFT JOIN classes c ON cm.class_id = c.id
      JOIN assignment_targets at ON
        (at.target_type = 'student' AND at.target_id = u.id) OR
        (at.target_type = 'class' AND at.target_id = c.id)
      WHERE at.assignment_id = ? AND u.role = 'student'
      ORDER BY u.full_name ASC
    `).all(assignmentId);

    // 2. Lấy thông tin bài nộp mới nhất của từng học sinh
    const submissionMap = new Map();
    const subList = db.prepare(`
      SELECT s.*, g.total_score, g.feedback, g.rubric_breakdown, g.graded_at
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.assignment_id = ?
      ORDER BY s.attempt_number ASC
    `).all(assignmentId);

    subList.forEach(s => {
      submissionMap.set(s.student_id, s);
    });

    // 3. Kết hợp dữ liệu
    let result = assignedStudents.map(student => {
      const sub = submissionMap.get(student.student_id);

      let statusDisplay = 'Chưa nộp bài';
      let statusCode = 'not_submitted';

      if (sub) {
        if (sub.status === 'draft') {
          statusDisplay = 'Đang làm bài (Bản nháp)';
          statusCode = 'in_progress';
        } else if (sub.status === 'submitted') {
          statusDisplay = sub.is_late ? 'Đã nộp bài (Trễ hạn)' : 'Đã nộp bài (Chờ nhận xét)';
          statusCode = sub.is_late ? 'late' : 'submitted';
        } else if (sub.status === 'graded') {
          statusDisplay = 'Đã nhận xét';
          statusCode = 'graded';
        } else if (sub.status === 'resubmission_requested') {
          statusDisplay = 'Yêu cầu làm lại';
          statusCode = 'resubmission_requested';
        }
      }

      return {
        student_id: student.student_id,
        username: student.username,
        full_name: student.full_name,
        class_name: student.class_name || 'Học sinh tự do',
        submission_id: sub ? sub.id : null,
        attempt_number: sub ? sub.attempt_number : 1,
        status_code: statusCode,
        status_display: statusDisplay,
        submitted_at: sub ? sub.submitted_at : null,
        is_late: sub ? sub.is_late : 0,
        total_score: sub ? sub.total_score : null,
        feedback: sub ? sub.feedback : null,
        word_count: sub ? sub.word_count : 0
      };
    });

    // Lọc theo query status nếu có
    if (status && status !== 'all') {
      result = result.filter(r => r.status_code === status);
    }

    return res.json({
      success: true,
      assignment,
      submissions: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xem chi tiết bài nộp để tiến hành chấm điểm
 */
function getSubmissionDetail(req, res, next) {
  try {
    const { submissionId } = req.params;

    const submission = db.prepare(`
      SELECT s.*, u.full_name AS student_name, u.username AS student_username,
             a.title AS assignment_title, a.content AS assignment_content,
             a.max_score AS assignment_max_score, a.due_date, a.allow_resubmit
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      JOIN assignments a ON s.assignment_id = a.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài nộp.'
      });
    }

    // Tiêu chí chấm Rubric của đề bài
    const rubrics = db.prepare('SELECT * FROM rubrics WHERE assignment_id = ? ORDER BY order_index ASC').all(submission.assignment_id);

    // Điểm số đã chấm (nếu có)
    const grade = db.prepare('SELECT * FROM grades WHERE submission_id = ?').get(submissionId);

    // Tệp đính kèm học sinh nộp (ảnh chụp bài giải, file)
    const attachments = db.prepare(`
      SELECT * FROM attachments WHERE entity_type = 'submission' AND entity_id = ?
    `).all(submissionId);

    // Lịch sử hỏi AI của học sinh trong bài tập này
    let aiInteractions = [];
    try {
      aiInteractions = db.prepare(`
        SELECT * FROM ai_interactions
        WHERE user_id = ? AND assignment_id = ?
        ORDER BY question_index ASC, created_at ASC
      `).all(submission.student_id, submission.assignment_id);
    } catch (e) {
      console.error('Lỗi lấy aiInteractions:', e);
    }

    return res.json({
      success: true,
      submission: {
        ...submission,
        rubrics,
        grade,
        attachments,
        aiInteractions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Chấm điểm bài làm theo rubric và nhận xét
 */
function gradeSubmission(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { submissionId } = req.params;
    const { rubric_scores = [], feedback = '' } = req.body;

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài nộp.'
      });
    }

    // Điểm số có thể bằng 0 nếu chỉ dùng chế độ nhận xét
    let totalScore = parseFloat(req.body.total_score) || 0;
    const rubricScoresList = Array.isArray(rubric_scores) ? rubric_scores : JSON.parse(rubric_scores || '[]');

    rubricScoresList.forEach(item => {
      if (item.score !== undefined) {
        totalScore += parseFloat(item.score) || 0;
      }
    });

    totalScore = Math.round(totalScore * 100) / 100;

    const cleanFeedback = cleanHtml(feedback);
    const breakdownJson = JSON.stringify(rubricScoresList);

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO grades (submission_id, teacher_id, total_score, feedback, rubric_breakdown, graded_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(submission_id) DO UPDATE SET
          teacher_id = excluded.teacher_id,
          total_score = excluded.total_score,
          feedback = excluded.feedback,
          rubric_breakdown = excluded.rubric_breakdown,
          graded_at = CURRENT_TIMESTAMP
      `).run(submissionId, teacherId, totalScore, cleanFeedback, breakdownJson);

      db.prepare(`
        UPDATE submissions SET status = 'graded', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(submissionId);

      logAction({
        userId: teacherId,
        action: 'GRADE_SUBMISSION',
        targetType: 'submissions',
        targetId: submissionId,
        ipAddress: req.ip,
        details: { student_id: submission.student_id }
      });
    });

    tx();

    return res.json({
      success: true,
      message: 'Đã hoàn tất nhận xét và trả bài cho học sinh thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Yêu cầu học sinh làm lại bài (cho phép nộp lần 2)
 */
function requestResubmission(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { submissionId } = req.params;
    const { reason = '' } = req.body;

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài nộp.'
      });
    }

    db.prepare(`
      UPDATE submissions
      SET status = 'resubmission_requested', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(submissionId);

    logAction({
      userId: teacherId,
      action: 'REQUEST_RESUBMISSION',
      targetType: 'submissions',
      targetId: submissionId,
      ipAddress: req.ip,
      details: { reason, student_id: submission.student_id }
    });

    return res.json({
      success: true,
      message: 'Đã mở quyền yêu cầu học sinh làm lại bài.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xuất toàn bộ bảng điểm của bài tập ra file Excel
 */
async function exportGradebook(req, res, next) {
  try {
    const { assignmentId } = req.params;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài tập.'
      });
    }

    const rubrics = db.prepare('SELECT * FROM rubrics WHERE assignment_id = ? ORDER BY order_index ASC').all(assignmentId);

    // Lấy danh sách học sinh kèm điểm
    const assignedStudents = db.prepare(`
      SELECT DISTINCT u.id AS student_id, u.username, u.full_name, c.name AS class_name
      FROM users u
      LEFT JOIN class_members cm ON u.id = cm.student_id
      LEFT JOIN classes c ON cm.class_id = c.id
      JOIN assignment_targets at ON
        (at.target_type = 'student' AND at.target_id = u.id) OR
        (at.target_type = 'class' AND at.target_id = c.id)
      WHERE at.assignment_id = ? AND u.role = 'student'
      ORDER BY u.full_name ASC
    `).all(assignmentId);

    const submissionMap = new Map();
    const subList = db.prepare(`
      SELECT s.*, g.total_score, g.feedback, g.rubric_breakdown
      FROM submissions s
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.assignment_id = ?
      ORDER BY s.attempt_number ASC
    `).all(assignmentId);

    subList.forEach(s => submissionMap.set(s.student_id, s));

    const submissionsData = assignedStudents.map(student => {
      const sub = submissionMap.get(student.student_id);

      let statusDisplay = 'Chưa nộp bài';
      if (sub) {
        if (sub.status === 'draft') statusDisplay = 'Đang làm (Nháp)';
        else if (sub.status === 'submitted') statusDisplay = sub.is_late ? 'Nộp trễ hạn' : 'Đã nộp';
        else if (sub.status === 'graded') statusDisplay = 'Đã chấm';
        else if (sub.status === 'resubmission_requested') statusDisplay = 'Làm lại';
      }

      return {
        username: student.username,
        full_name: student.full_name,
        class_name: student.class_name || 'Tự do',
        status_display: statusDisplay,
        submitted_at: sub && sub.submitted_at ? sub.submitted_at : null,
        total_score: sub ? sub.total_score : null,
        feedback: sub ? sub.feedback : '',
        rubric_breakdown: sub ? sub.rubric_breakdown : null
      };
    });

    const buffer = await exportGradebookToExcel({
      assignment,
      rubrics,
      submissions: submissionsData
    });

    const safeTitle = assignment.title.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Bang_Diem_${safeTitle}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSubmissionsByAssignment,
  getSubmissionDetail,
  gradeSubmission,
  requestResubmission,
  exportGradebook
};
