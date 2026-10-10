const db = require('../database/db');

/**
 * Tra cứu tiến độ học tập và điểm số dành cho Phụ huynh
 * Cho phép phụ huynh nhập Mã học sinh (username) để theo dõi bài tập
 */
function lookupStudentProgress(req, res, next) {
  try {
    const studentCode = (req.params.code || req.query.code || '').trim();

    if (!studentCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Mã học sinh cần tra cứu.'
      });
    }

    // Tìm học sinh theo username hoặc mã
    const student = db.prepare(`
      SELECT id, username, full_name, status, created_at
      FROM users
      WHERE role = 'student' AND (LOWER(username) = LOWER(?) OR id = ?)
      LIMIT 1
    `).get(studentCode, isNaN(studentCode) ? -1 : parseInt(studentCode, 10));

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin học sinh với mã này. Vui lòng kiểm tra lại.'
      });
    }

    // Lấy thông tin lớp học
    const classes = db.prepare(`
      SELECT c.id, c.name, c.code
      FROM classes c
      JOIN class_members cm ON c.id = cm.class_id
      WHERE cm.student_id = ?
    `).all(student.id);

    // Lấy danh sách toàn bộ bài tập được giao cho học sinh này
    const assignments = db.prepare(`
      SELECT DISTINCT 
        a.id AS assignment_id,
        a.title,
        a.due_date,
        a.max_score,
        s.id AS submission_id,
        s.status AS submission_status,
        s.submitted_at,
        s.is_late,
        g.total_score,
        g.feedback,
        g.graded_at
      FROM assignments a
      JOIN assignment_targets at ON a.id = at.assignment_id
      LEFT JOIN class_members cm ON at.target_type = 'class' AND at.target_id = cm.class_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE (at.target_type = 'student' AND at.target_id = ?)
         OR (at.target_type = 'class' AND cm.student_id = ?)
      ORDER BY a.due_date DESC
    `).all(student.id, student.id, student.id);

    // Tính toán thống kê tiến độ
    let totalAssignments = assignments.length;
    let submittedCount = 0;
    let gradedCount = 0;
    let totalScoreSum = 0;
    let pendingCount = 0;

    const list = assignments.map(a => {
      let statusText = 'Chưa nộp';
      let statusType = 'pending';

      if (a.submission_status === 'graded') {
        statusText = 'Đã có điểm';
        statusType = 'graded';
        gradedCount++;
        submittedCount++;
        totalScoreSum += (a.total_score || 0);
      } else if (a.submission_status === 'submitted') {
        statusText = 'Đã nộp (Chờ chấm)';
        statusType = 'submitted';
        submittedCount++;
      } else if (a.submission_status === 'draft') {
        statusText = 'Đang làm dở';
        statusType = 'draft';
        pendingCount++;
      } else {
        pendingCount++;
      }

      return {
        id: a.assignment_id,
        title: a.title,
        due_date: a.due_date,
        max_score: a.max_score,
        status: statusType,
        status_text: statusText,
        submitted_at: a.submitted_at,
        is_late: !!a.is_late,
        score: a.total_score !== null && a.total_score !== undefined ? a.total_score : null,
        feedback: a.feedback || null,
        graded_at: a.graded_at || null
      };
    });

    const averageScore = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : null;

    return res.json({
      success: true,
      student: {
        id: student.id,
        code: student.username,
        full_name: student.full_name,
        classes: classes.map(c => c.name).join(', ') || 'Chưa phân lớp'
      },
      stats: {
        total: totalAssignments,
        submitted: submittedCount,
        graded: gradedCount,
        pending: pendingCount,
        average_score: averageScore
      },
      assignments: list
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  lookupStudentProgress
};
