const db = require('../src/database/db');
const bcrypt = require('bcryptjs');

// 1. Xóa các tài khoản học sinh mẫu cũ
db.prepare("DELETE FROM users WHERE username IN ('hs_tranvanb', 'hs_lethic', 'hs_phamvand', 'hs_giapnm')").run();

// 2. Đảm bảo đúng 3 học sinh tồn tại với mật khẩu 123456
const saltRounds = 10;
const studentHash = bcrypt.hashSync('123456', saltRounds);

const studentsData = [
  { username: 'nguyenminhgiap123', full_name: 'Nguyễn Minh Giáp' },
  { username: 'nguyentiendung123', full_name: 'Nguyễn Tiến Dũng' },
  { username: 'dinhquanghuy123', full_name: 'Đinh Quang Huy' }
];

studentsData.forEach(st => {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(st.username);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, status, must_change_password)
      VALUES (?, ?, ?, 'student', 'active', 0)
    `).run(st.username, studentHash, st.full_name);
  }
});

// 3. Đảm bảo lớp học tồn tại
let cls = db.prepare("SELECT id FROM classes WHERE code = 'LOP9A2026'").get();
let teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' LIMIT 1").get();
const teacherId = teacher ? teacher.id : 1;

if (!cls) {
  const r = db.prepare(`
    INSERT INTO classes (name, code, description, created_by)
    VALUES ('Lớp 9A - Ôn thi vào 10', 'LOP9A2026', 'Lớp luyện thi môn Toán vào lớp 10 THPT công lập', ?)
  `).run(teacherId);
  cls = { id: r.lastInsertRowid };
}

const classId = cls.id;

// 4. Thêm đúng 3 học sinh vào lớp 9A
const addMember = db.prepare('INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)');
studentsData.forEach(st => {
  const u = db.prepare('SELECT id FROM users WHERE username = ?').get(st.username);
  if (u) addMember.run(classId, u.id);
});

// 5. Cập nhật phân phối bài tập cho lớp 9A
const assignments = db.prepare('SELECT id FROM assignments').all();
assignments.forEach(a => {
  db.prepare("INSERT OR IGNORE INTO assignment_targets (assignment_id, target_type, target_id) VALUES (?, 'class', ?)").run(a.id, classId);
});

console.log('✅ Cập nhật danh sách 3 học sinh thành công!');
console.log('--- Danh sách Users: ---');
console.log(db.prepare('SELECT id, username, full_name, role FROM users').all());
console.log('--- Thành viên Lớp 9A: ---');
console.log(db.prepare('SELECT cm.class_id, c.name, u.username, u.full_name FROM class_members cm JOIN users u ON cm.student_id = u.id JOIN classes c ON cm.class_id = c.id').all());
