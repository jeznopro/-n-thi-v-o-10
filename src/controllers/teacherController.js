const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { logAction } = require('../utils/logger');
const { parseStudentsFromExcel, generateStudentImportTemplate } = require('../utils/excelHelper');
const fs = require('fs');

/**
 * Thống kê tổng quan cho màn hình Dashboard Giáo viên
 */
function getDashboardStats(req, res, next) {
  try {
    const totalStudents = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get().count;
    const totalClasses = db.prepare("SELECT COUNT(*) AS count FROM classes").get().count;
    const totalAssignments = db.prepare("SELECT COUNT(*) AS count FROM assignments").get().count;
    const pendingGrading = db.prepare("SELECT COUNT(*) AS count FROM submissions WHERE status = 'submitted'").get().count;

    // Lấy 5 hoạt động gần nhất
    const recentLogs = db.prepare(`
      SELECT al.*, u.full_name, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 5
    `).all();

    return res.json({
      success: true,
      stats: {
        totalStudents,
        totalClasses,
        totalAssignments,
        pendingGrading
      },
      recentLogs
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách toàn bộ học sinh
 */
function getStudents(req, res, next) {
  try {
    const { search, class_id } = req.query;

    let query = `
      SELECT u.id, u.username, u.full_name, u.status, u.created_at,
             c.id AS class_id, c.name AS class_name, c.code AS class_code
      FROM users u
      LEFT JOIN class_members cm ON u.id = cm.student_id
      LEFT JOIN classes c ON cm.class_id = c.id
      WHERE u.role = 'student'
    `;
    const params = [];

    if (class_id) {
      query += ` AND cm.class_id = ?`;
      params.push(class_id);
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.username LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY u.id DESC`;

    const students = db.prepare(query).all(...params);

    return res.json({
      success: true,
      students
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tạo một tài khoản học sinh mới
 */
function createStudent(req, res, next) {
  try {
    const { username, full_name, password, class_id } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    if (!username || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập và Họ tên học sinh là bắt buộc.'
      });
    }

    const normUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(normUsername);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Tên đăng nhập "${normUsername}" đã tồn tại trên hệ thống.`
      });
    }

    const rawPassword = password && password.trim() ? password.trim() : 'Hocsinh@123';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, status, must_change_password)
      VALUES (?, ?, ?, 'student', 'active', 0)
    `).run(normUsername, passwordHash, full_name.trim());

    const studentId = result.lastInsertRowid;

    // Gán vào lớp nếu có chọn
    if (class_id) {
      db.prepare(`
        INSERT OR IGNORE INTO class_members (class_id, student_id)
        VALUES (?, ?)
      `).run(class_id, studentId);
    }

    logAction({
      userId: req.user.id,
      action: 'CREATE_STUDENT',
      targetType: 'users',
      targetId: studentId,
      ipAddress: ip,
      details: { username: normUsername, full_name, class_id }
    });

    return res.json({
      success: true,
      message: 'Tạo tài khoản học sinh thành công!',
      student: {
        id: studentId,
        username: normUsername,
        full_name: full_name.trim()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật thông tin học sinh
 */
function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const { username, full_name, class_id } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Họ và tên học sinh không được để trống.'
      });
    }

    const currentStudent = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(id);
    if (!currentStudent) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh.'
      });
    }

    let newUsername = currentStudent.username;
    if (username && username.trim()) {
      newUsername = username.trim().toLowerCase();
      // Kiểm tra xem tên đăng nhập mới có bị trùng với tài khoản khác không
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(newUsername, id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Tên đăng nhập "${newUsername}" đã được sử dụng bởi tài khoản khác.`
        });
      }
    }

    db.prepare(`
      UPDATE users SET username = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'student'
    `).run(newUsername, full_name.trim(), id);

    // Cập nhật lớp học
    if (class_id !== undefined) {
      db.prepare('DELETE FROM class_members WHERE student_id = ?').run(id);
      if (class_id) {
        db.prepare('INSERT INTO class_members (class_id, student_id) VALUES (?, ?)').run(class_id, id);
      }
    }

    logAction({
      userId: req.user.id,
      action: 'UPDATE_STUDENT',
      targetType: 'users',
      targetId: id,
      ipAddress: ip,
      details: { username: newUsername, full_name, class_id }
    });

    return res.json({
      success: true,
      message: 'Cập nhật thông tin học sinh thành công!',
      student: {
        id,
        username: newUsername,
        full_name: full_name.trim()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Khóa hoặc mở khóa tài khoản học sinh
 */
function toggleLockStudent(req, res, next) {
  try {
    const { id } = req.params;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const student = db.prepare("SELECT id, status, username FROM users WHERE id = ? AND role = 'student'").get(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh.'
      });
    }

    const newStatus = student.status === 'active' ? 'locked' : 'active';
    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

    logAction({
      userId: req.user.id,
      action: newStatus === 'locked' ? 'LOCK_STUDENT' : 'UNLOCK_STUDENT',
      targetType: 'users',
      targetId: id,
      ipAddress: ip,
      details: { username: student.username, newStatus }
    });

    return res.json({
      success: true,
      message: newStatus === 'locked' ? 'Đã khóa tài khoản học sinh.' : 'Đã mở khóa tài khoản học sinh.',
      newStatus
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Đặt lại mật khẩu cho học sinh
 */
function resetStudentPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const defaultPwd = new_password && new_password.trim() ? new_password.trim() : 'Hocsinh@123';
    const passwordHash = bcrypt.hashSync(defaultPwd, 10);

    const result = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'student'
    `).run(passwordHash, id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh.'
      });
    }

    logAction({
      userId: req.user.id,
      action: 'RESET_PASSWORD_STUDENT',
      targetType: 'users',
      targetId: id,
      ipAddress: ip
    });

    return res.json({
      success: true,
      message: `Đã đặt lại mật khẩu cho học sinh thành: "${defaultPwd}"`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Xóa học sinh khỏi hệ thống
 */
function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'student'").run(id);
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học sinh.'
      });
    }

    logAction({
      userId: req.user.id,
      action: 'DELETE_STUDENT',
      targetType: 'users',
      targetId: id,
      ipAddress: ip
    });

    return res.json({
      success: true,
      message: 'Đã xóa tài khoản học sinh thành công.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tải file Excel mẫu import danh sách học sinh
 */
async function downloadImportTemplate(req, res, next) {
  try {
    const buffer = await generateStudentImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_Danh_Sach_Hoc_Sinh.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Import danh sách học sinh từ file Excel hoặc CSV
 */
async function importStudents(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn tệp Excel hoặc CSV để tải lên.'
      });
    }

    const students = await parseStudentsFromExcel(req.file.path);

    // Xóa file tạm sau khi đọc xong
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File không chứa dòng dữ liệu học sinh hợp lệ nào.'
      });
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors = [];

    const insertUserStmt = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, status, must_change_password)
      VALUES (?, ?, ?, 'student', 'active', 0)
    `);

    const findClassStmt = db.prepare('SELECT id FROM classes WHERE code = ? OR name = ?');
    const insertMemberStmt = db.prepare('INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)');

    const tx = db.transaction(() => {
      for (const item of students) {
        const normUsername = item.username.trim().toLowerCase();
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(normUsername);

        let studentId = null;

        if (existing) {
          studentId = existing.id;
          skippedCount++;
        } else {
          const rawPwd = item.password || 'Hocsinh@123';
          const pwdHash = bcrypt.hashSync(rawPwd, 10);
          const res = insertUserStmt.run(normUsername, pwdHash, item.full_name);
          studentId = res.lastInsertRowid;
          successCount++;
        }

        // Nếu có mã lớp, gán vào lớp
        if (item.class_code && studentId) {
          const cls = findClassStmt.get(item.class_code, item.class_code);
          if (cls) {
            insertMemberStmt.run(cls.id, studentId);
          }
        }
      }
    });

    tx();

    logAction({
      userId: req.user.id,
      action: 'IMPORT_STUDENTS',
      targetType: 'users',
      ipAddress: req.ip,
      details: { total: students.length, added: successCount, skipped: skippedCount }
    });

    return res.json({
      success: true,
      message: `Nhập dữ liệu hoàn tất: Đã thêm mới ${successCount} học sinh, bỏ qua ${skippedCount} tài khoản đã tồn tại.`,
      stats: { total: students.length, added: successCount, skipped: skippedCount }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

/**
 * Quản lý Lớp học: Lấy danh sách lớp
 */
function getClasses(req, res, next) {
  try {
    const classes = db.prepare(`
      SELECT c.*, COUNT(cm.student_id) AS student_count
      FROM classes c
      LEFT JOIN class_members cm ON c.id = cm.class_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    return res.json({
      success: true,
      classes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Quản lý Lớp học: Tạo lớp mới
 */
function createClass(req, res, next) {
  try {
    const { name, code, description } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Tên lớp và Mã lớp không được để trống.'
      });
    }

    const normCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM classes WHERE code = ?').get(normCode);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã lớp "${normCode}" đã tồn tại.`
      });
    }

    const result = db.prepare(`
      INSERT INTO classes (name, code, description, created_by)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), normCode, description ? description.trim() : null, req.user.id);

    logAction({
      userId: req.user.id,
      action: 'CREATE_CLASS',
      targetType: 'classes',
      targetId: result.lastInsertRowid,
      ipAddress: ip,
      details: { name, code: normCode }
    });

    return res.json({
      success: true,
      message: 'Tạo lớp học mới thành công!',
      classId: result.lastInsertRowid
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Quản lý Lớp học: Sửa thông tin lớp
 */
function updateClass(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên lớp không được để trống.'
      });
    }

    const currentClass = db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
    if (!currentClass) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lớp học.'
      });
    }

    let newCode = currentClass.code;
    if (code && code.trim()) {
      newCode = code.trim().toUpperCase();
      const existing = db.prepare('SELECT id FROM classes WHERE code = ? AND id != ?').get(newCode, id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Mã lớp "${newCode}" đã được sử dụng bởi lớp khác.`
        });
      }
    }

    db.prepare(`
      UPDATE classes SET name = ?, code = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name.trim(), newCode, description !== undefined ? (description ? description.trim() : null) : currentClass.description, id);

    return res.json({
      success: true,
      message: 'Cập nhật thông tin lớp học thành công!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Quản lý Lớp học: Xóa lớp
 */
function deleteClass(req, res, next) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM classes WHERE id = ?').run(id);

    return res.json({
      success: true,
      message: 'Đã xóa lớp học thành công.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getStudents,
  createStudent,
  updateStudent,
  toggleLockStudent,
  resetStudentPassword,
  deleteStudent,
  downloadImportTemplate,
  importStudents,
  getClasses,
  createClass,
  updateClass,
  deleteClass
};
