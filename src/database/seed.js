const bcrypt = require('bcryptjs');

/**
 * Nạp 4 chuyên đề bài giảng lý thuyết ôn thi vào 10 nếu chưa có
 */
function seedSampleLessonsIfEmpty(db) {
  try {
    const lessonCount = db.prepare('SELECT COUNT(*) AS count FROM lessons').get()?.count || 0;
    if (lessonCount > 0) return;

    let teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' LIMIT 1").get();
    const teacherId = teacher ? teacher.id : 1;

    console.log('📚 Đang nạp 4 Chuyên đề Bài giảng Lý thuyết Toán vào 10 mẫu...');

    const insertLesson = db.prepare(`
      INSERT INTO lessons (title, category, summary, content, key_formulas, class_id, created_by)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `);

    // Chuyên đề 1: Rút gọn biểu thức
    insertLesson.run(
      'Chuyên đề 1: Rút gọn biểu thức chứa căn thức bậc hai & Các dạng toán phụ',
      'Đại số',
      'Tổng hợp các công thức căn bậc hai, quy trình 4 bước rút gọn và phương pháp xử lý 5 dạng toán phụ hay gặp nhất trong đề thi vào 10.',
      `### I. Kiến thức cơ bản cần ghi nhớ

1. **Điều kiện xác định (ĐKXĐ):**
   - Biểu thức $\\sqrt{A}$ có nghĩa $\\Leftrightarrow A \\ge 0$.
   - Phân thức $\\frac{A}{B}$ có nghĩa $\\Leftrightarrow B \\ne 0$.
   - $\\frac{A}{\\sqrt{B}}$ có nghĩa $\\Leftrightarrow B > 0$.
   > *Lưu ý sống còn:* Luôn tìm và ghi ĐKXĐ ngay từ dòng đầu tiên của bài toán rút gọn!

2. **Hằng đẳng thức căn thức:**
   $$\\sqrt{A^2} = |A| = \\begin{cases} A & \\text{khi } A \\ge 0 \\\\ -A & \\text{khi } A < 0 \\end{cases}$$

---

### II. Quy trình 4 bước rút gọn chuẩn
- **Bước 1:** Đặt điều kiện xác định cho tất cả các căn thức và phân thức trong biểu thức.
- **Bước 2:** Phân tích các mẫu thức thành nhân tử (dùng hằng đẳng thức $x - 9 = (\\sqrt{x}-3)(\\sqrt{x}+3)$, $x - 4 = (\\sqrt{x}-2)(\\sqrt{x}+2)$...).
- **Bước 3:** Quy đồng mẫu thức chung, nhân phá ngoặc ở tử số, thu gọn tử số.
- **Bước 4:** Rút gọn nhân tử chung giữa tử và mẫu, ghi rõ kết quả cuối cùng kèm ĐKXĐ.

---

### III. Phương pháp giải 5 dạng câu hỏi phụ thường gặp

1. **Tính giá trị biểu thức khi $x = x_0$:**
   - Nếu $x_0$ có dạng chứa căn như $x = 4 - 2\\sqrt{3}$, hãy đưa về bình phương: $x = (\\sqrt{3} - 1)^2 \\Rightarrow \\sqrt{x} = \\sqrt{3} - 1$.
   - Kiểm tra ĐKXĐ trước khi thay vào biểu thức đã rút gọn.

2. **So sánh giá trị biểu thức $P$ với số thực $k$:**
   - *Quy tắc:* Luôn xét hiệu $P - k$, quy đồng và đánh giá dấu của tử và mẫu theo ĐKXĐ. Tuyệt đối không quy đồng bỏ mẫu khi chưa biết dấu!

3. **Tìm $x$ để biểu thức nhận giá trị nguyên ($P \\in \\mathbb{Z}$):**
   - *Loại 1 (Bậc tử < bậc mẫu hoặc phân thức dạng $\\frac{k}{\\sqrt{x} + a}$):* Dùng ước số nguyên. $\\sqrt{x} + a$ phải là ước của $k$.
   - *Loại 2 (Bậc tử = bậc mẫu dạng $\\frac{a\\sqrt{x} + b}{c\\sqrt{x} + d}$):* Lấy tử chia cho mẫu: $P = q + \\frac{r}{c\\sqrt{x} + d}$, sau đó ép phần dư là ước số.
   - *Loại 3 (Biểu thức chặn được miền giá trị):* Đánh giá khoảng giá trị $m < P < M$, tìm các giá trị nguyên khả dĩ của $P$ rồi giải phương trình tìm $x$.

4. **Tìm giá trị lớn nhất (GTLN) / nhỏ nhất (GTNN):**
   - Dùng bất đẳng thức Cô-si (AM-GM) cho các biểu thức dạng $A\\sqrt{x} + \\frac{B}{\\sqrt{x}}$.
   - Hoặc biến đổi hằng đẳng thức thêm bớt để có dạng $(\\sqrt{x} - m)^2 + k \\ge k$.`,
      `1. $\\sqrt{A^2} = |A|$
2. $\\sqrt{A \\cdot B} = \\sqrt{A} \\cdot \\sqrt{B}$ ($A \\ge 0, B \\ge 0$)
3. $\\sqrt{\\frac{A}{B}} = \\frac{\\sqrt{A}}{\\sqrt{B}}$ ($A \\ge 0, B > 0$)
4. Trục căn thức: $\\frac{m}{\\sqrt{A} \\pm \\sqrt{B}} = \\frac{m(\\sqrt{A} \\mp \\sqrt{B})}{A - B}$`,
      teacherId
    );

    // Chuyên đề 2: Hệ thức Vi-ét
    insertLesson.run(
      'Chuyên đề 2: Phương trình bậc hai & Định lý Vi-ét cùng các ứng dụng',
      'Hệ thức Vi-ét',
      'Toàn bộ kiến thức về biệt thức Delta, định lý Vi-ét thuận/đảo, điều kiện dấu nghiệm và phương pháp giải bài toán chứa tham số m.',
      `### I. Định lý Vi-ét và Công thức nghiệm

Cho phương trình bậc hai: $ax^2 + bx + c = 0$ ($a \\ne 0$).

1. **Biệt thức:**
   - $\\Delta = b^2 - 4ac$ (hoặc $\\Delta' = b'^2 - ac$ với $b = 2b'$).
   - $\\Delta < 0$: Phương trình vô nghiệm.
   - $\\Delta = 0$: Phương trình có nghiệm kép $x_1 = x_2 = -\\frac{b}{2a}$.
   - $\\Delta > 0$: Phương trình có 2 nghiệm phân biệt $x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.

2. **Hệ thức Vi-ét:**
   $$S = x_1 + x_2 = -\\frac{b}{a}, \\quad P = x_1 \\cdot x_2 = \\frac{c}{a}$$

---

### II. Các hệ thức đối xứng kinh điển thường gặp

Khi đề bài yêu cầu thỏa mãn một biểu thức đối xứng giữa $x_1$ và $x_2$, ta biến đổi về tổng $S$ và tích $P$:

- $x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1x_2 = S^2 - 2P$
- $(x_1 - x_2)^2 = (x_1 + x_2)^2 - 4x_1x_2 = S^2 - 4P$
- $|x_1 - x_2| = \\sqrt{S^2 - 4P}$
- $x_1^3 + x_2^3 = (x_1 + x_2)(x_1^2 - x_1x_2 + x_2^2) = S(S^2 - 3P)$
- $\\frac{1}{x_1} + \\frac{1}{x_2} = \\frac{x_1 + x_2}{x_1x_2} = \\frac{S}{P}$
- $\\frac{x_1}{x_2} + \\frac{x_2}{x_1} = \\frac{x_1^2 + x_2^2}{x_1x_2} = \\frac{S^2 - 2P}{P}$

---

### III. Điều kiện dấu của 2 nghiệm

- Phương trình có 2 nghiệm trái dấu $\\Leftrightarrow ac < 0$.
- Phương trình có 2 nghiệm cùng dấu $\\Leftrightarrow \\begin{cases} \\Delta \\ge 0 \\\\ P > 0 \\end{cases}$
- Phương trình có 2 nghiệm cùng dương $\\Leftrightarrow \\begin{cases} \\Delta \\ge 0 \\\\ S > 0 \\\\ P > 0 \\end{cases}$
- Phương trình có 2 nghiệm cùng âm $\\Leftrightarrow \\begin{cases} \\Delta \\ge 0 \\\\ S < 0 \\\\ P > 0 \\end{cases}$`,
      `1. $\\Delta = b^2 - 4ac$
2. $S = x_1 + x_2 = -\\frac{b}{a}$
3. $P = x_1 \\cdot x_2 = \\frac{c}{a}$
4. $x_1^2 + x_2^2 = S^2 - 2P$
5. $(x_1 - x_2)^2 = S^2 - 4P$`,
      teacherId
    );

    // Chuyên đề 3: Tứ giác nội tiếp
    insertLesson.run(
      'Chuyên đề 3: Tứ giác nội tiếp đường tròn & Kỹ thuật chứng minh hình học 9',
      'Hình học',
      '4 Dấu hiệu nhận biết tứ giác nội tiếp, chuỗi tính chất về góc trong đường tròn và chiến thuật tư duy các câu hình thi vào 10.',
      `### I. 4 Dấu hiệu nhận biết Tứ giác nội tiếp

Một tứ giác $ABCD$ nội tiếp đường tròn nếu thỏa mãn một trong các dấu hiệu sau:

1. **Dấu hiệu 1 (Tổng 2 góc đối bằng $180^\\circ$):**
   $$\\widehat{A} + \\widehat{C} = 180^\\circ \\quad \\text{hoặc} \\quad \\widehat{B} + \\widehat{D} = 180^\\circ$$
   *(Thường gặp nhất khi có hai góc vuông đối nhau như $\\widehat{ABC} = \\widehat{ADC} = 90^\\circ$)*.

2. **Dấu hiệu 2 (Hai đỉnh cùng nhìn một cạnh dưới hai góc bằng nhau):**
   Hai đỉnh kề nhau cùng nhìn cạnh chứa hai đỉnh còn lại dưới một góc bằng nhau:
   $$\\widehat{DAC} = \\widehat{DBC}$$
   *(Thường gặp khi tứ giác có hai đường chéo cắt nhau, xuất hiện 2 tam giác vuông có chung cạnh huyền)*.

3. **Dấu hiệu 3 (Góc ngoài bằng góc đối trong):**
   Góc ngoài tại một đỉnh bằng góc trong tại đỉnh đối diện của đỉnh đó.

4. **Dấu hiệu 4 (Cách đều tâm):**
   Bốn đỉnh $A, B, C, D$ cùng cách đều một điểm $O$ cố định:
   $$OA = OB = OC = OD = R$$

---

### II. Các góc với đường tròn cần thuộc lòng

- **Góc nội tiếp và góc ở tâm:** $\\widehat{AMB} = \\frac{1}{2} \\widehat{AOB} = \\frac{1}{2} \\text{sđ}\\overparen{AB}$.
- **Góc tạo bởi tiếp tuyến và dây cung:** Số đo bằng một nửa số đo cung bị chắn $\\Rightarrow$ Bằng góc nội tiếp cùng chắn cung đó:
  $$\\widehat{xAB} = \\widehat{ACB} = \\frac{1}{2} \\text{sđ}\\overparen{AB}$$
- **Hệ quả cực kỳ hay dùng:** Mọi góc nội tiếp chắn nửa đường tròn đều là góc vuông ($90^\\circ$).`,
      `1. Dấu hiệu 1: $\\widehat{A} + \\widehat{C} = 180^\\circ$
2. Dấu hiệu 2: $\\widehat{DAC} = \\widehat{DBC}$
3. Dấu hiệu 3: Góc ngoài = góc đối trong
4. Dấu hiệu 4: Cùng cách đều tâm $O$ bán kính $R$
5. Tiếp tuyến & dây cung: $\\widehat{xAB} = \\widehat{ACB}$`,
      teacherId
    );

    // Chuyên đề 4: Bất đẳng thức Cô-si
    insertLesson.run(
      'Chuyên đề 4: Bất đẳng thức Cô-si (AM-GM) & Kỹ thuật chọn điểm rơi (Câu phân loại 9 - 10 điểm)',
      'Bất đẳng thức & Cực trị',
      'Bí quyết chinh phục câu cuối cùng phân loại học sinh giỏi: Bất đẳng thức AM-GM, Cauchy-Schwarz dạng Engel và kỹ thuật thêm bớt hạng tử.',
      `### I. Bất đẳng thức AM-GM (Cô-si)

1. **Cho 2 số không âm $a, b \\ge 0$:**
   $$a + b \\ge 2\\sqrt{ab}$$
   *Dấu đẳng thức xảy ra khi và chỉ khi:* $a = b$.

   *Hệ quả thường dùng:*
   - $ab \\le \\frac{(a+b)^2}{4}$
   - $a^2 + b^2 \\ge 2ab$
   - $(a+b)^2 \\ge 4ab$

2. **Cho 3 số không âm $a, b, c \\ge 0$:**
   $$a + b + c \\ge 3\\sqrt[3]{abc}$$
   *Dấu đẳng thức xảy ra khi và chỉ khi:* $a = b = c$.

---

### II. Bất đẳng thức Cauchy-Schwarz dạng phân thức (BĐT Engel / Schwarz)

Cho các số thực $x, y$ và các số dương $a, b > 0$:
$$\\frac{x^2}{a} + \\frac{y^2}{b} \\ge \\frac{(x+y)^2}{a+b}$$
*Dấu đẳng thức xảy ra khi:* $\\frac{x}{a} = \\frac{y}{b}$.

*Mở rộng cho 3 số:*
$$\\frac{x^2}{a} + \\frac{y^2}{b} + \\frac{z^2}{c} \\ge \\frac{(x+y+z)^2}{a+b+c}$$
*(Đây là công cụ số 1 để giải các bài toán cực trị có chứa phân thức đối xứng trong đề thi vào 10)*.

---

### III. Kỹ thuật then chốt: Chọn điểm rơi

*Nguyên tắc vàng:* Trước khi áp dụng AM-GM, phải dự đoán chính xác giá trị của các biến khi đạt cực trị (điểm rơi).
- **Ví dụ kinh điển:** Cho $x \\ge 2$. Tìm GTNN của $P = x + \\frac{1}{x}$.
  - Sai lầm thường gặp: Áp dụng ngay $x + \\frac{1}{x} \\ge 2\\sqrt{x \\cdot \\frac{1}{x}} = 2$ (Dấu '=' xảy ra khi $x = 1$, trái với giả thiết $x \\ge 2$!).
  - Cách làm đúng (Tách theo điểm rơi $x = 2$):
    $$P = \\left(\\frac{x}{4} + \\frac{1}{x}\\right) + \\frac{3x}{4} \\ge 2\\sqrt{\\frac{x}{4} \\cdot \\frac{1}{x}} + \\frac{3 \\cdot 2}{4} = 1 + \\frac{3}{2} = \\frac{5}{2}$$
    Dấu '=' xảy ra khi $\\frac{x}{4} = \\frac{1}{x} \\Leftrightarrow x = 2$ (thỏa mãn). Vậy $\\min P = \\frac{5}{2}$.`,
      `1. AM-GM (2 số): $a + b \\ge 2\\sqrt{ab}$ ($a, b \\ge 0$)
2. BĐT Engel: $\\frac{x^2}{a} + \\frac{y^2}{b} \\ge \\frac{(x+y)^2}{a+b}$ ($a,b > 0$)
3. $(a+b)\\left(\\frac{1}{a} + \\frac{1}{b}\\right) \\ge 4$
4. $a^2 + b^2 + c^2 \\ge ab + bc + ca$`,
      teacherId
    );

    console.log('✅ Đã nạp thành công 4 Chuyên đề Bài giảng Lý thuyết Toán vào 10!');
  } catch (err) {
    console.warn('⚠️ Lỗi nạp bài giảng lý thuyết:', err.message);
  }
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

    // 2. Học sinh THCS
    insertUser.run('hs_tranvanb', studentPasswordHash, 'Trần Văn Bình', 'student', 'active', 0);
    insertUser.run('hs_lethic', studentPasswordHash, 'Lê Thị Cúc', 'student', 'active', 0);
    insertUser.run('hs_phamvand', studentPasswordHash, 'Phạm Văn Dũng', 'student', 'active', 0);
    insertUser.run('nguyenminhgiap123', studentPasswordHash, 'Nguyễn Minh Giáp', 'student', 'active', 0);
    insertUser.run('hs_giapnm', studentPasswordHash, 'Nguyễn Minh Giáp', 'student', 'active', 0);

    const studentB = db.prepare('SELECT id FROM users WHERE username = ?').get('hs_tranvanb');
    const studentC = db.prepare('SELECT id FROM users WHERE username = ?').get('hs_lethic');

    // 3. Lớp học mẫu
    const classRes = insertClass.run(
      'Lớp 9A - Ôn thi vào 10',
      'LOP9A2026',
      'Lớp luyện thi môn Toán vào lớp 10 THPT công lập',
      teacher.id
    );
    const classId = classRes.lastInsertRowid;

    // Thêm học sinh vào lớp 9A
    insertClassMember.run(classId, studentB.id);
    insertClassMember.run(classId, studentC.id);

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
