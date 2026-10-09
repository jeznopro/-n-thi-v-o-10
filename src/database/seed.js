const bcrypt = require('bcryptjs');

function seedDatabase(customDb) {
  const db = customDb || require('./db');
  console.log('🔄 Bắt đầu nạp dữ liệu mẫu Môn TOÁN THCS theo TỪNG CÂU HỎI...');

  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM attachments;
    DELETE FROM grades;
    DELETE FROM submissions;
    DELETE FROM rubrics;
    DELETE FROM assignment_targets;
    DELETE FROM assignments;
    DELETE FROM class_members;
    DELETE FROM classes;
    DELETE FROM users;
    DELETE FROM login_attempts;
  `);

  const saltRounds = 10;
  const teacherPasswordHash = bcrypt.hashSync('123456', saltRounds);
  const studentPasswordHash = bcrypt.hashSync('123456', saltRounds);

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, status, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertClass = db.prepare(`
    INSERT INTO classes (name, code, description, created_by)
    VALUES (?, ?, ?, ?)
  `);

  const insertClassMember = db.prepare(`
    INSERT INTO class_members (class_id, student_id)
    VALUES (?, ?)
  `);

  const insertAssignment = db.prepare(`
    INSERT INTO assignments (title, content, max_score, time_limit_minutes, due_date, allow_resubmit, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssignmentTarget = db.prepare(`
    INSERT INTO assignment_targets (assignment_id, target_type, target_id, custom_content)
    VALUES (?, ?, ?, ?)
  `);

  const insertRubric = db.prepare(`
    INSERT INTO rubrics (assignment_id, criteria_name, description, max_score, order_index)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const runSeed = db.transaction(() => {
    // 1. Giáo viên Toán
    insertUser.run('giaovien', teacherPasswordHash, 'Thầy Nguyễn Văn Toán', 'teacher', 'active', 0);
    const teacher = db.prepare('SELECT id FROM users WHERE username = ?').get('giaovien');

    // 2. Học sinh THCS
    insertUser.run('hs_tranvanb', studentPasswordHash, 'Trần Văn Bình', 'student', 'active', 0);
    insertUser.run('hs_lethic', studentPasswordHash, 'Lê Thị Cúc', 'student', 'active', 0);
    insertUser.run('hs_phamvand', studentPasswordHash, 'Phạm Văn Dũng', 'student', 'active', 0);
    insertUser.run('nguyenminhgiap123', studentPasswordHash, 'Nguyễn Minh Giáp', 'student', 'active', 0);
    insertUser.run('hs_giapnm', studentPasswordHash, 'Nguyễn Minh Giáp', 'student', 'active', 0);


    const studentB = db.prepare('SELECT id FROM users WHERE username = ?').get('hs_tranvanb');
    const studentC = db.prepare('SELECT id FROM users WHERE username = ?').get('hs_lethic');
    const studentD = db.prepare('SELECT id FROM users WHERE username = ?').get('hs_phamvand');

    // 3. Lớp học mẫu
    insertClass.run('Lớp 9A - Toán Đại Số & Hình Học (Ôn thi vào 10)', 'TOAN9A', 'Lớp bồi dưỡng và luyện đề thi tự luận Toán THCS', teacher.id);
    const class9A = db.prepare('SELECT id FROM classes WHERE code = ?').get('TOAN9A');

    insertClassMember.run(class9A.id, studentB.id);
    insertClassMember.run(class9A.id, studentC.id);
    insertClassMember.run(class9A.id, studentD.id);

    const now = new Date();
    const dueDate1 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const dueDate2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 4. BÀI TẬP 1: TOÁN 9 - CẤU TRÚC THEO 4 CÂU HỎI
    const questions1 = [
      {
        id: 1,
        title: "Câu 1: Rút gọn biểu thức chứa căn bậc hai",
        score: 3.0,
        content: `Cho biểu thức: $P = \\left( \\frac{\\sqrt{x}}{\\sqrt{x} - 1} - \\frac{1}{x - \\sqrt{x}} \\right) : \\frac{\\sqrt{x} + 1}{x - 1}$ với $x > 0, x \\neq 1$.<br>
                  a) (2.0 điểm) Rút gọn biểu thức $P$.<br>
                  b) (1.0 điểm) Tìm các giá trị của $x$ để $P = \\frac{1}{2}$.`
      },
      {
        id: 2,
        title: "Câu 2: Giải bài toán bằng cách lập hệ phương trình",
        score: 2.0,
        content: `Hai tổ công nhân cùng làm chung một công việc thì hoàn thành trong 12 giờ. Nếu tổ một làm trong 4 giờ rồi tổ hai làm tiếp một mình trong 7 giờ thì cả hai tổ hoàn thành được $\\frac{5}{12}$ công việc. Hỏi mỗi tổ làm một mình thì sau bao lâu sẽ hoàn thành công việc?`
      },
      {
        id: 3,
        title: "Câu 3: Hình học đường tròn",
        score: 4.0,
        content: `Từ điểm $A$ nằm ngoài đường tròn $(O; R)$, kẻ hai tiếp tuyến $AB, AC$ với đường tròn ($B, C$ là các tiếp điểm). Gọi $H$ là giao điểm của $OA$ và $BC$.<br>
                  a) (1.5 điểm) Chứng minh bốn điểm $A, B, O, C$ cùng thuộc một đường tròn và $OA \\perp BC$.<br>
                  b) (1.5 điểm) Kẻ đường kính $BD$ của $(O)$. Đoạn thẳng $AD$ cắt $(O)$ tại $E$ ($E \\neq D$). Chứng minh: $AH \\cdot AO = AE \\cdot AD$.<br>
                  c) (1.0 điểm) Chứng minh góc $\\widehat{AHE} = \\widehat{ADO}$.`
      },
      {
        id: 4,
        title: "Câu 4: Bất đẳng thức nâng cao",
        score: 1.0,
        content: `Cho các số thực dương $a, b, c$ thỏa mãn $a + b + c = 3$. Tìm giá trị nhỏ nhất của biểu thức:<br>
                  $$M = \\frac{a^2}{b + 1} + \\frac{b^2}{c + 1} + \\frac{c^2}{a + 1}$$`
      }
    ];

    const res1 = insertAssignment.run(
      'Kiểm tra tự luận Toán 9: Căn thức, Hệ phương trình & Hình học',
      JSON.stringify(questions1),
      10.0,
      60,
      dueDate1,
      1,
      teacher.id
    );
    const assign1Id = res1.lastInsertRowid;
    insertAssignmentTarget.run(assign1Id, 'class', class9A.id, null);

    // Rubric tự động theo từng câu
    questions1.forEach((q, idx) => {
      insertRubric.run(assign1Id, q.title, `Chấm điểm theo các bước giải của ${q.title}`, q.score, idx + 1);
    });

    // 5. BÀI TẬP 2: TOÁN 8 - CẤU TRÚC THEO 3 CÂU HỎI
    const questions2 = [
      {
        id: 1,
        title: "Bài 1: Phân tích đa thức thành nhân tử",
        score: 3.0,
        content: `Phân tích các đa thức sau thành nhân tử:<br>
                  a) $3x^2 - 6xy + 3y^2$<br>
                  b) $x^2 - 4y^2 + 2x + 1$<br>
                  c) $x^4 + 4$`
      },
      {
        id: 2,
        title: "Bài 2: Giải phương trình tìm x",
        score: 3.0,
        content: `Tìm $x$, biết:<br>
                  a) $(x - 2)^2 - (x - 2)(x + 3) = 0$<br>
                  b) $2x^3 - 50x = 0$`
      },
      {
        id: 3,
        title: "Bài 3: Hình học tứ giác",
        score: 4.0,
        content: `Cho tam giác $ABC$ nhọn. Gọi $M, N$ lần lượt là trung điểm của $AB, AC$. Lấy điểm $P$ đối xứng với $M$ qua $N$.<br>
                  a) (2.0 điểm) Tứ giác $AMCP$ là hình gì? Vì sao?<br>
                  b) (1.5 điểm) Tứ giác $BMCP$ là hình gì? Vì sao?<br>
                  c) (0.5 điểm) Tam giác $ABC$ cần thêm điều kiện gì để tứ giác $AMCP$ là hình chữ nhật?`
      }
    ];

    const res2 = insertAssignment.run(
      'Chuyên đề Tự luận Toán 8: Hằng đẳng thức và Tứ giác đặc biệt',
      JSON.stringify(questions2),
      10.0,
      null,
      dueDate2,
      1,
      teacher.id
    );
    const assign2Id = res2.lastInsertRowid;
    insertAssignmentTarget.run(assign2Id, 'student', studentB.id, null);
    insertAssignmentTarget.run(assign2Id, 'student', studentC.id, null);

    questions2.forEach((q, idx) => {
      insertRubric.run(assign2Id, q.title, `Chấm điểm ${q.title}`, q.score, idx + 1);
    });

    insertAuditLog.run(
      teacher.id,
      'SEED_DATABASE_QUESTIONS',
      'system',
      null,
      '127.0.0.1',
      JSON.stringify({ message: 'Khởi tạo dữ liệu bài tập dạng từng câu hỏi thành công' })
    );
  });

  runSeed();

  console.log('✅ Nạp dữ liệu mẫu môn TOÁN THCS theo TỪNG CÂU HỎI thành công!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
