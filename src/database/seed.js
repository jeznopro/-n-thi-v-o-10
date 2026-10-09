const bcrypt = require('bcryptjs');

/**
 * Nạp các chương học và bài giảng theo chuẩn phân phối chương trình của Thầy cô
 */
function seedSampleChaptersAndLessons(db) {
  try {
    let teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' LIMIT 1").get();
    const teacherId = teacher ? teacher.id : 1;

    // 1. Kiểm tra bảng chapters
    let chapterCount = db.prepare('SELECT COUNT(*) AS count FROM chapters').get()?.count || 0;
    if (chapterCount === 0) {
      console.log('📂 Đang khởi tạo 5 Chương học Toán 9 chuẩn...');
      const insertChapter = db.prepare(`
        INSERT INTO chapters (title, description, order_index, class_id, created_by)
        VALUES (?, ?, ?, NULL, ?)
      `);

      insertChapter.run(
        'Chương 1: Phương trình và hệ phương trình bậc nhất hai ẩn',
        'Phương trình bậc nhất hai ẩn, hệ hai phương trình bậc nhất hai ẩn, các phương pháp giải hệ và giải bài toán bằng cách lập hệ phương trình.',
        1,
        teacherId
      );
      insertChapter.run(
        'Chương 2: Phương trình và bất phương trình bậc nhất 1 ẩn',
        'Bất đẳng thức, bất phương trình bậc nhất một ẩn, phương trình bậc hai một ẩn và định lý Vi-ét ứng dụng ôn thi vào 10.',
        2,
        teacherId
      );
      insertChapter.run(
        'Chương 3: Căn bậc hai và căn bậc ba',
        'Căn bậc hai, căn bậc ba, các phép tính biến đổi căn thức và kỹ thuật rút gọn biểu thức chứa căn bậc hai.',
        3,
        teacherId
      );
      insertChapter.run(
        'Chương 4: Hệ thức lượng trong tam giác',
        'Một số hệ thức về cạnh và đường cao trong tam giác vuông, tỉ số lượng giác góc nhọn và ứng dụng thực tế giải tam giác.',
        4,
        teacherId
      );
      insertChapter.run(
        'Chương 5: Đường tròn',
        'Sự xác định của đường tròn, tính chất đối xứng, vị trí tương đối, tiếp tuyến của đường tròn và tứ giác nội tiếp.',
        5,
        teacherId
      );
      console.log('✅ Đã nạp thành công 5 Chương học!');
    }

    // Lấy ID các chương
    const ch1 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 1%' LIMIT 1").get();
    const ch2 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 2%' LIMIT 1").get();
    const ch3 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 3%' LIMIT 1").get();
    const ch4 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 4%' LIMIT 1").get();
    const ch5 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 5%' LIMIT 1").get();

    // 2. Gán các bài giảng hiện có vào các chương tương ứng nếu chưa có chapter_id
    if (ch3) {
      db.prepare(`UPDATE lessons SET chapter_id = ?, order_index = 1 WHERE (id = 1 OR title LIKE '%Rút gọn%') AND (chapter_id IS NULL OR chapter_id = 0)`).run(ch3.id);
    }
    if (ch2) {
      db.prepare(`UPDATE lessons SET chapter_id = ?, order_index = 2 WHERE (id = 2 OR title LIKE '%Vi-ét%') AND (chapter_id IS NULL OR chapter_id = 0)`).run(ch2.id);
      db.prepare(`UPDATE lessons SET chapter_id = ?, order_index = 3 WHERE (id = 4 OR title LIKE '%Cô-si%') AND (chapter_id IS NULL OR chapter_id = 0)`).run(ch2.id);
    }
    if (ch5) {
      db.prepare(`UPDATE lessons SET chapter_id = ?, order_index = 1 WHERE (id = 3 OR title LIKE '%Tứ giác nội tiếp%') AND (chapter_id IS NULL OR chapter_id = 0)`).run(ch5.id);
    }

    // 3. Bổ sung bài giảng mẫu cho Chương 1 và Chương 4 nếu chưa có
    const insertLesson = db.prepare(`
      INSERT INTO lessons (title, category, summary, content, key_formulas, video_url, document_url, chapter_id, order_index, class_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `);

    if (ch1) {
      const hasCh1Lessons = db.prepare('SELECT COUNT(*) AS count FROM lessons WHERE chapter_id = ?').get(ch1.id)?.count || 0;
      if (hasCh1Lessons === 0) {
        insertLesson.run(
          'Bài 1: Khái niệm hệ hai phương trình bậc nhất hai ẩn & Phương pháp giải (Cộng đại số & Thế)',
          'Đại số',
          'Dạng tổng quát của hệ phương trình bậc nhất 2 ẩn, định lý về số nghiệm và 2 phương pháp giải cốt lõi: phương pháp cộng đại số và phương pháp thế.',
          `### I. Khái niệm Hệ hai phương trình bậc nhất hai ẩn

Dạng tổng quát:
$$\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases} \\quad (a^2+b^2 \\ne 0, \\; a'^2+b'^2 \\ne 0)$$

1. **Số nghiệm của hệ phương trình:**
   - Hệ có nghiệm duy nhất $\\Leftrightarrow \\frac{a}{a'} \\ne \\frac{b}{b'}$.
   - Hệ vô nghiệm $\\Leftrightarrow \\frac{a}{a'} = \\frac{b}{b'} \\ne \\frac{c}{c'}$.
   - Hệ có vô số nghiệm $\\Leftrightarrow \\frac{a}{a'} = \\frac{b}{b'} = \\frac{c}{c'}$.

---

### II. Hai phương pháp giải cơ bản

1. **Phương pháp thế:**
   - Từ một phương trình của hệ, biểu diễn một ẩn theo ẩn kia (ví dụ rút $y = \\dots$ theo $x$).
   - Thế biểu thức vừa rút vào phương trình còn lại để được phương trình bậc nhất 1 ẩn.
   - Giải phương trình 1 ẩn rồi tìm nốt ẩn còn lại.

2. **Phương pháp cộng đại số:**
   - Nhân cả hai vế của mỗi phương trình với một số thích hợp để hệ số của cùng một ẩn bằng nhau hoặc đối nhau.
   - Trừ hoặc cộng từng vế hai phương trình để triệt tiêu một ẩn.
   - Giải phương trình 1 ẩn thu được.`,
          `1. Dạng tổng quát: $\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases}$
2. Nghiệm duy nhất: $\\frac{a}{a'} \\ne \\frac{b}{b'}$
3. Vô nghiệm: $\\frac{a}{a'} = \\frac{b}{b'} \\ne \\frac{c}{c'}$
4. Vô số nghiệm: $\\frac{a}{a'} = \\frac{b}{b'} = \\frac{c}{c'}$`,
          'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
          'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          ch1.id,
          1,
          teacherId
        );

        insertLesson.run(
          'Bài 2: Giải bài toán bằng cách lập hệ phương trình (Toán năng suất & Chuyển động)',
          'Đại số',
          'Phương pháp 3 bước lập hệ phương trình cho 2 dạng toán thường gặp nhất trong đề thi vào 10: toán năng suất chung-riêng và toán chuyển động cùng/ngược chiều.',
          `### I. Quy trình 3 bước giải bài toán bằng cách lập hệ phương trình

- **Bước 1: Lập hệ phương trình:**
  - Chọn 2 ẩn số phù hợp và đặt điều kiện thích hợp cho ẩn (đơn vị đo, số tự nhiên, số dương...).
  - Biểu diễn các đại lượng chưa biết theo ẩn và các đại lượng đã biết.
  - Lập 2 phương trình biểu thị mối quan hệ giữa các đại lượng.

- **Bước 2: Giải hệ phương trình vừa lập.**

- **Bước 3: Đối chiếu điều kiện và trả lời bài toán.**

---

### II. Các công thức then chốt

1. **Toán chuyển động:**
   $$\\text{Quãng đường } S = v \\cdot t, \\quad v = \\frac{S}{t}, \\quad t = \\frac{S}{v}$$
   - Chuyển động xuôi dòng: $v_{\\text{xuôi}} = v_{\\text{thực}} + v_{\\text{dòng nước}}$
   - Chuyển động ngược dòng: $v_{\\text{ngược}} = v_{\\text{thực}} - v_{\\text{dòng nước}}$

2. **Toán năng suất - làm chung làm riêng:**
   - Coi toàn bộ công việc hoàn thành là $1$ đơn vị.
   - Năng suất trong 1 ngày (hoặc 1 giờ) là $\\frac{1}{x}$ và $\\frac{1}{y}$.`,
          `1. $S = v \\cdot t$
2. $v_{\\text{xuôi}} = v_{\\text{thực}} + v_{\\text{nước}}$
3. $v_{\\text{ngược}} = v_{\\text{thực}} - v_{\\text{nước}}$
4. Năng suất 1 đơn vị thời gian: $\\frac{1}{x} + \\frac{1}{y} = \\frac{1}{t_{\\text{chung}}}$`,
          'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
          'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          ch1.id,
          2,
          teacherId
        );
      }
    }

    if (ch4) {
      const hasCh4Lessons = db.prepare('SELECT COUNT(*) AS count FROM lessons WHERE chapter_id = ?').get(ch4.id)?.count || 0;
      if (hasCh4Lessons === 0) {
        insertLesson.run(
          'Bài 1: Các hệ thức lượng trong tam giác vuông & Tỉ số lượng giác',
          'Hình học',
          'Hệ thống 5 công thức hệ thức lượng trong tam giác vuông cùng định nghĩa $\\sin, \\cos, \\tan, \\cot$ và các hệ thức lượng giác cơ bản.',
          `### I. Các hệ thức về cạnh và đường cao trong tam giác vuông

Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$. Đặt $BC = a, AC = b, AB = c, AH = h, BH = c', CH = b'$.

1. $b^2 = a \\cdot b', \\quad c^2 = a \\cdot c'$ (Bình phương cạnh góc vuông bằng tích cạnh huyền với hình chiếu)
2. $h^2 = b' \\cdot c'$ (Bình phương đường cao bằng tích hai hình chiếu)
3. $b \\cdot c = a \\cdot h$ (Tích hai cạnh góc vuông bằng tích cạnh huyền với đường cao)
4. $\\frac{1}{h^2} = \\frac{1}{b^2} + \\frac{1}{c^2}$ (Nghịch đảo bình phương đường cao)
5. $a^2 = b^2 + c^2$ (Định lý Pythagore)

---

### II. Tỉ số lượng giác của góc nhọn $\\alpha$

- $\\sin \\alpha = \\frac{\\text{Đối}}{\\text{Huyền}}$
- $\\cos \\alpha = \\frac{\\text{Kề}}{\\text{Huyền}}$
- $\\tan \\alpha = \\frac{\\text{Đối}}{\\text{Kề}}$
- $\\cot \\alpha = \\frac{\\text{Kề}}{\\text{Đối}}$

**Các công thức lượng giác cơ bản:**
$$\\sin^2 \\alpha + \\cos^2 \\alpha = 1, \\quad \\tan \\alpha = \\frac{\\sin \\alpha}{\\cos \\alpha}, \\quad \\tan \\alpha \\cdot \\cot \\alpha = 1$$`,
          `1. $b^2 = a \\cdot b', \\; c^2 = a \\cdot c'$
2. $h^2 = b' \\cdot c'$
3. $b \\cdot c = a \\cdot h$
4. $\\frac{1}{h^2} = \\frac{1}{b^2} + \\frac{1}{c^2}$
5. $\\sin^2 \\alpha + \\cos^2 \\alpha = 1$`,
          'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
          'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          ch4.id,
          1,
          teacherId
        );
      }
    }

  } catch (err) {
    console.warn('⚠️ Lỗi nạp chương và bài giảng:', err.message);
  }
}

/**
 * Nạp 4 chuyên đề bài giảng lý thuyết ôn thi vào 10 nếu chưa có
 */
function seedSampleLessonsIfEmpty(db) {
  seedSampleChaptersAndLessons(db);
}

/**
 * Khởi tạo dữ liệu mẫu ban đầu
 * TUYỆT ĐỐI KHÔNG XÓA DỮ LIỆU ĐANG CÓ
 */
function seedDatabase(customDb) {
  const db = customDb || require('./db');

  // 1. Kiểm tra an toàn: Nếu đã có dữ liệu người dùng, KHÔNG XÓA mà chỉ bổ sung bài giảng nếu thiếu
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count || 0;
  if (userCount > 0) {
    console.log('🛡️ Hệ thống đã có dữ liệu người dùng. Giữ nguyên toàn bộ dữ liệu hiện tại.');
    seedSampleLessonsIfEmpty(db);
    return;
  }

  console.log('🔄 Bắt đầu nạp dữ liệu mẫu ban đầu cho hệ thống...');

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

    // 2. Đúng 3 học sinh: Giáp, Dũng, Huy
    insertUser.run('nguyenminhgiap123', studentPasswordHash, 'Nguyễn Minh Giáp', 'student', 'active', 0);
    insertUser.run('nguyentiendung123', studentPasswordHash, 'Nguyễn Tiến Dũng', 'student', 'active', 0);
    insertUser.run('dinhquanghuy123', studentPasswordHash, 'Đinh Quang Huy', 'student', 'active', 0);

    const studentGiap = db.prepare('SELECT id FROM users WHERE username = ?').get('nguyenminhgiap123');
    const studentDung = db.prepare('SELECT id FROM users WHERE username = ?').get('nguyentiendung123');
    const studentHuy = db.prepare('SELECT id FROM users WHERE username = ?').get('dinhquanghuy123');

    // 3. Lớp học mẫu
    const classRes = insertClass.run(
      'Lớp 9A - Ôn thi vào 10',
      'LOP9A2026',
      'Lớp luyện thi môn Toán vào lớp 10 THPT công lập',
      teacher.id
    );
    const classId = classRes.lastInsertRowid;

    // Thêm cả 3 học sinh vào lớp 9A
    insertClassMember.run(classId, studentGiap.id);
    insertClassMember.run(classId, studentDung.id);
    insertClassMember.run(classId, studentHuy.id);

    // 4. Đề thi Toán chia theo từng câu hỏi
    const questions1 = [
      {
        id: 'q1',
        title: 'Câu 1 (2.0 điểm): Rút gọn biểu thức và tính giá trị',
        content: '<p>Cho hai biểu thức:</p><p>$$A = \\frac{\\sqrt{x} + 2}{\\sqrt{x} - 2}$$</p><p>$$B = \\frac{\\sqrt{x}}{\\sqrt{x} + 2} + \\frac{4\\sqrt{x}}{x - 4}$$ với $x \\ge 0, x \\ne 4$.</p><ol type="a"><li>Tính giá trị của biểu thức $A$ khi $x = 9$.</li><li>Rút gọn biểu thức $B$.</li><li>Tìm các giá trị nguyên của $x$ để $P = A \\cdot B$ nhận giá trị nguyên.</li></ol>',
        score: 2.0
      },
      {
        id: 'q2',
        title: 'Câu 2 (2.0 điểm): Giải bài toán bằng cách lập phương trình hoặc hệ phương trình',
        content: '<p>Một xưởng may theo kế hoạch phải may 1000 bộ quần áo trong một thời gian quy định. Nhờ cải tiến kỹ thuật, mỗi ngày xưởng đã may thêm được 10 bộ quần áo so với kế hoạch. Do đó xưởng đã hoàn thành trước kế hoạch 5 ngày. Hỏi theo kế hoạch, mỗi ngày xưởng phải may bao nhiêu bộ quần áo?</p>',
        score: 2.0
      },
      {
        id: 'q3',
        title: 'Câu 3 (2.0 điểm): Hệ phương trình & Phương trình bậc hai Vi-ét',
        content: '<ol><li>Giải hệ phương trình:<br>$$\\begin{cases} 2(x+y) + \\sqrt{x-1} = 7 \\\\ 3(x+y) - 2\\sqrt{x-1} = 7 \\end{cases}$$</li><li>Cho phương trình: $x^2 - 2(m-1)x + 2m - 5 = 0$ ($m$ là tham số). Tìm $m$ để phương trình có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn: $$x_1^2 + x_2^2 + 2x_1x_2 = 16$$</li></ol>',
        score: 2.0
      },
      {
        id: 'q4',
        title: 'Câu 4 (3.5 điểm): Hình học tổng hợp (Đường tròn & Tứ giác nội tiếp)',
        content: '<p>Cho tam giác nhọn $ABC$ ($AB < AC$) nội tiếp đường tròn $(O)$. Hai đường cao $BE$ và $CF$ cắt nhau tại trực tâm $H$.</p><ol type="a"><li>Chứng minh tứ giác $AEHF$ và tứ giác $BCEF$ nội tiếp đường tròn.</li><li>Kẻ đường kính $AK$ của đường tròn $(O)$. Chứng minh tam giác $ABK$ đồng dạng với tam giác $AFC$ và tứ giác $BHCK$ là hình bình hành.</li><li>Gọi $M$ là trung điểm của $BC$. Chứng minh $H, M, K$ thẳng hàng và $AH = 2OM$.</li></ol>',
        score: 3.5
      },
      {
        id: 'q5',
        title: 'Câu 5 (0.5 điểm): Bất đẳng thức & Giá trị nhỏ nhất (Câu phân loại)',
        content: '<p>Cho các số thực dương $a, b, c$ thỏa mãn điều kiện $a + b + c \\le 3$.</p><p>Tìm giá trị nhỏ nhất của biểu thức:</p><p>$$P = \\frac{1}{a^2 + b^2 + c^2} + \\frac{2026}{ab + bc + ca}$$</p>',
        score: 0.5
      }
    ];

    const dueDate1 = new Date();
    dueDate1.setDate(dueDate1.getDate() + 7);

    const res1 = insertAssignment.run(
      'Đề thi thử Toán vào 10 - Lần 1 (Đại số & Hình học)',
      JSON.stringify(questions1),
      10.0,
      120,
      dueDate1.toISOString(),
      0,
      teacher.id
    );
    const assign1Id = res1.lastInsertRowid;
    insertAssignmentTarget.run(assign1Id, 'class', classId, null);

    questions1.forEach((q, idx) => {
      insertRubric.run(assign1Id, q.title, `Chấm điểm chi tiết ${q.title}`, q.score, idx + 1);
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

  // Nạp 4 bài giảng lý thuyết mẫu
  seedSampleLessonsIfEmpty(db);

  console.log('✅ Nạp dữ liệu mẫu ban đầu thành công!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
