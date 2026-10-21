const db = require('../src/database/db');

function seedReviews() {
  console.log('🔄 Bắt đầu nạp các phần Ôn tập Giữa kỳ và Cuối kỳ...');

  let teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' LIMIT 1").get();
  const teacherId = teacher ? teacher.id : 9;

  let defaultClass = db.prepare("SELECT id FROM classes LIMIT 1").get();
  const classId = defaultClass ? defaultClass.id : null;

  // 1. Thêm 4 Chương / Chuyên đề Ôn tập
  const reviewChapters = [
    {
      title: 'Chuyên đề: Ôn tập Giữa học kỳ 1 (Đại số & Hình học)',
      description: 'Tổng hợp kiến thức trọng tâm giữa học kỳ 1: Rút gọn biểu thức chứa căn, hệ hai phương trình bậc nhất hai ẩn, giải bài toán bằng cách lập hệ phương trình và các hệ thức lượng trong tam giác vuông.',
      order_index: 11
    },
    {
      title: 'Chuyên đề: Ôn tập Cuối học kỳ 1 (Tổng ôn toàn diện HK1)',
      description: 'Tổng ôn toàn diện toàn bộ học kỳ 1: Phương trình & BPT bậc nhất 1 ẩn, bất đẳng thức Cô-si, sự xác định đường tròn, tính chất tiếp tuyến và các dạng toán ôn thi học kỳ 1 có đáp án chi tiết.',
      order_index: 12
    },
    {
      title: 'Chuyên đề: Ôn tập Giữa học kỳ 2 (Phương trình bậc hai & Xác suất Thống kê)',
      description: 'Trọng tâm giữa học kỳ 2: Hàm số y = ax² và đồ thị Parabol, sự tương giao (d) và (P), định lý Vi-ét ứng dụng, bảng tần số - biểu đồ thống kê và xác suất của biến cố đơn giản.',
      order_index: 13
    },
    {
      title: 'Chuyên đề: Ôn tập Cuối học kỳ 2 & Luyện đề tuyển sinh vào 10',
      description: 'Tổng ôn tập toàn bộ kiến thức Toán 9 cả năm: Tứ giác nội tiếp, các bài toán hình khối trong thực tiễn (trụ, nón, cầu), kỹ thuật chứng minh hình học 9 và bộ đề thi thử vào 10 cấu trúc chuẩn.',
      order_index: 14
    }
  ];

  const insertChapter = db.prepare(`
    INSERT INTO chapters (title, description, order_index, class_id, created_by)
    VALUES (?, ?, ?, NULL, ?)
  `);

  reviewChapters.forEach(c => {
    const existing = db.prepare('SELECT id FROM chapters WHERE title = ?').get(c.title);
    if (!existing) {
      insertChapter.run(c.title, c.description, c.order_index, teacherId);
      console.log('✅ Đã thêm chương: ' + c.title);
    } else {
      console.log('ℹ️ Đã có chương: ' + c.title);
    }
  });

  const ch11 = db.prepare("SELECT id FROM chapters WHERE order_index = 11 LIMIT 1").get();
  const ch12 = db.prepare("SELECT id FROM chapters WHERE order_index = 12 LIMIT 1").get();
  const ch13 = db.prepare("SELECT id FROM chapters WHERE order_index = 13 LIMIT 1").get();
  const ch14 = db.prepare("SELECT id FROM chapters WHERE order_index = 14 LIMIT 1").get();

  // 2. Thêm Bài giảng Ôn tập chi tiết vào từng chương
  const insertLesson = db.prepare(`
    INSERT INTO lessons (title, category, summary, content, key_formulas, video_url, document_url, chapter_id, order_index, class_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- BÀI GIẢNG 1: ÔN TẬP GIỮA HK1 ---
  if (ch11) {
    const hasLesson = db.prepare('SELECT id FROM lessons WHERE chapter_id = ?').get(ch11.id);
    if (!hasLesson) {
      insertLesson.run(
        'Đề cương & Chuyên đề ôn tập Giữa học kỳ 1 (Ma trận, Lý thuyết & Các dạng toán trọng tâm)',
        'Ôn tập kiểm tra',
        'Tổng hợp ma trận đề thi giữa HK1: Rút gọn biểu thức căn thức bậc hai, giải hệ phương trình bằng phương pháp cộng/thế, giải bài toán bằng cách lập hệ PT và 5 hệ thức lượng trong tam giác vuông.',
        `### I. Ma trận kiến thức Đề thi Giữa Học kỳ 1

| Phần | Nội dung kiến thức | Mức độ & Tỉ lệ điểm |
| :--- | :--- | :---: |
| **Phần 1: Căn thức** | Căn bậc hai số học, rút gọn biểu thức $A, B$ chứa căn, tìm $x$ để $P = A/B < k$ hoặc nguyên | 2.5 - 3.0 điểm |
| **Phần 2: Hệ phương trình** | Giải hệ PT bằng phương pháp thế hoặc cộng đại số; giải bài toán thực tế (chuyển động, năng suất) | 2.5 - 3.0 điểm |
| **Phần 3: Hệ thức lượng** | Hệ thức cạnh - đường cao tam giác vuông, tỉ số lượng giác góc nhọn $\\sin, \\cos, \\tan$, toán thực tế | 3.0 - 3.5 điểm |
| **Phần 4: Nâng cao** | Tìm GTLN, GTNN hoặc giải phương trình vô tỉ nâng cao | 0.5 - 1.0 điểm |

---

### II. Hệ thống phương pháp giải các dạng toán trọng tâm

#### 1. Dạng 1: Rút gọn biểu thức chứa căn bậc hai
- **Bước 1**: Đặt điều kiện xác định ($x \\ge 0, x \\ne a$).
- **Bước 2**: Phân tích mẫu thức thành nhân tử để tìm mẫu thức chung (áp dụng hằng đẳng thức $x - a = (\\sqrt{x} - \\sqrt{a})(\\sqrt{x} + \\sqrt{a})$).
- **Bước 3**: Quy đồng, thu gọn tử thức và rút gọn triệt để với mẫu.

#### 2. Dạng 2: Giải bài toán bằng cách lập hệ phương trình
- **Toán chuyển động:** Quãng đường $S = v \\cdot t$. Chú ý đổi đơn vị phút ra giờ.
  - Xuôi dòng: $v_{xuôi} = v_{thực} + v_{nước}$
  - Ngược dòng: $v_{ngược} = v_{thực} - v_{nước}$
- **Toán năng suất:** Coi toàn bộ khối lượng công việc là $1$. Năng suất 1 ngày của người thứ nhất là $\\frac{1}{x}$, người thứ hai là $\\frac{1}{y}$.

#### 3. Dạng 3: Hệ thức lượng tam giác vuông và ứng dụng thực tế
- Nhớ kỹ $a^2 = b^2 + c^2$ (Pythagore), $b^2 = a \\cdot b'$, $h^2 = b' \\cdot c'$, $bc = ah$.
- Ứng dụng đo chiều cao cây/tháp bằng giác kế: Chiều cao $H = h_{giác kế} + d \\cdot \\tan \\alpha$.`,
        `1. $\\sqrt{A^2} = |A| = \\begin{cases} A & \\text{khi } A \\ge 0 \\\\ -A & \\text{khi } A < 0 \\end{cases}
2. $\\frac{C}{\\sqrt{A} \\pm \\sqrt{B}} = \\frac{C(\\sqrt{A} \\mp \\sqrt{B})}{A - B}$
3. Hệ PT: $\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases}$ (Có nghiệm duy nhất $\\Leftrightarrow \\frac{a}{a'} \\ne \\frac{b}{b'}$)
4. Hệ thức lượng: $b^2 = a \\cdot b'; \\quad h^2 = b' \\cdot c'; \\quad bc = ah; \\quad \\frac{1}{h^2} = \\frac{1}{b^2} + \\frac{1}{c^2}$`,
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        null,
        ch11.id,
        1,
        classId,
        teacherId
      );
      console.log('✅ Đã nạp bài giảng Ôn tập Giữa HK1');
    }
  }

  // --- BÀI GIẢNG 2: ÔN TẬP CUỐI HK1 ---
  if (ch12) {
    const hasLesson = db.prepare('SELECT id FROM lessons WHERE chapter_id = ?').get(ch12.id);
    if (!hasLesson) {
      insertLesson.run(
        'Đề cương & Bộ đề ôn tập Cuối học kỳ 1 (Tổng hợp Đại số, Bất đẳng thức & Đường tròn)',
        'Ôn tập kiểm tra',
        'Tổng hợp kiến thức toàn bộ Học kỳ 1: Bất đẳng thức Cô-si tìm GTLN-GTNN, sự xác định đường tròn, tính chất 2 tiếp tuyến cắt nhau và kỹ thuật giải bài toán hình học tổng hợp.',
        `### I. Cấu trúc Đề thi Cuối Học kỳ 1 Toán 9
- **Bài 1 (2.0đ):** Bài toán rút gọn căn thức và các câu hỏi phụ.
- **Bài 2 (2.0đ):** Giải hệ phương trình và toán đố thực tế (kinh tế, phần trăm, lãi suất).
- **Bài 3 (1.5đ):** Phương trình, bất phương trình bậc nhất 1 ẩn và hàm số bậc nhất.
- **Bài 4 (3.5đ):** Bài toán hình học đường tròn (3 - 4 câu a, b, c, d):
  - Chứng minh các điểm cùng thuộc đường tròn.
  - Chứng minh tiếp tuyến của đường tròn.
  - Tính độ dài đoạn thẳng, số đo góc, chứng minh tích đoạn thẳng.
- **Bài 5 (1.0đ):** Bất đẳng thức AM-GM (Cô-si) hoặc bài toán cực trị hình học.

---

### II. Các định lý then chốt cần nắm vững

#### 1. Tính chất tiếp tuyến của đường tròn
- Nếu đường thẳng $d$ là tiếp tuyến của $(O; R)$ tại tiếp điểm $H$ thì $d \\perp OH$ tại $H$ và khoảng cách $d(O, d) = R$.
- **Tính chất 2 tiếp tuyến cắt nhau:** Nếu $MA, MB$ là hai tiếp tuyến của $(O)$ cắt nhau tại $M$ ($A, B$ là tiếp điểm):
  1. $MA = MB$.
  2. $MO$ là tia phân giác của $\\widehat{AMB}$.
  3. $OM$ là tia phân giác của $\\widehat{AOB}$.
  4. Đường thẳng $OM$ là đường trung trực của đoạn thẳng $AB$.

#### 2. Kỹ thuật chứng minh tiếp tuyến của đường tròn
- **Cách 1:** Chứng minh đường thẳng vuông góc với bán kính tại đầu mút đi qua đường tròn.
- **Cách 2:** Kẻ $OH \\perp d$ tại $H$, chứng minh độ dài $OH = R$.`,
        `1. BĐT Cô-si cho 2 số $a, b \\ge 0$: $a + b \\ge 2\\sqrt{ab}$. Dấu "=" xảy ra $\\Leftrightarrow a = b$.
2. Hệ quả: $ab \\le \\frac{(a+b)^2}{4}; \\quad a^2 + b^2 \\ge \\frac{(a+b)^2}{2}$.
3. Đường kính và dây: Đường kính đi qua trung điểm của một dây không đi qua tâm thì vuông góc với dây ấy.
4. Hai tiếp tuyến cắt nhau tại $M$: $MA = MB$ và $OM \\perp AB$ tại trung điểm $I$.`,
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        null,
        ch12.id,
        1,
        classId,
        teacherId
      );
      console.log('✅ Đã nạp bài giảng Ôn tập Cuối HK1');
    }
  }

  // --- BÀI GIẢNG 3: ÔN TẬP GIỮA HK2 ---
  if (ch13) {
    const hasLesson = db.prepare('SELECT id FROM lessons WHERE chapter_id = ?').get(ch13.id);
    if (!hasLesson) {
      insertLesson.run(
        'Đề cương & Chuyên đề ôn tập Giữa học kỳ 2 (Hàm số Parabol, Hệ thức Vi-ét & Thống kê Xác suất)',
        'Ôn tập kiểm tra',
        'Trọng tâm giữa HK2 chương trình mới: Khảo sát và vẽ đồ thị parabol y = ax², sự tương giao giữa (P) và (d), định lý Vi-ét tính giá trị biểu thức đối xứng, bảng tần số tương đối và xác suất thực nghiệm.',
        `### I. Trọng tâm Kiến thức Giữa Học kỳ 2

#### 1. Đồ thị Parabol $y = ax^2$ ($a \\ne 0$) và Đường thẳng $(d): y = mx + n$
- Phương trình hoành độ giao điểm của $(P)$ và $(d)$:
  $$ax^2 - mx - n = 0$$
- Số giao điểm của $(d)$ và $(P)$ bằng số nghiệm của phương trình hoành độ giao điểm:
  - $\\Delta > 0$: $(d)$ cắt $(P)$ tại hai điểm phân biệt.
  - $\\Delta = 0$: $(d)$ tiếp xúc $(P)$ tại một điểm (tiếp điểm).
  - $\\Delta < 0$: $(d)$ không cắt $(P)$.

#### 2. Định lý Vi-ét và các biểu thức đối xứng thường gặp
Cho phương trình bậc hai $ax^2 + bx + c = 0$ ($a \\ne 0$) có nghiệm. Khi đó:
$$S = x_1 + x_2 = -\\frac{b}{a}, \\quad P = x_1 x_2 = \\frac{c}{a}$$
- $A = x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1 x_2 = S^2 - 2P$
- $B = x_1^3 + x_2^3 = (x_1 + x_2)(x_1^2 - x_1 x_2 + x_2^2) = S(S^2 - 3P)$
- $C = |x_1 - x_2| = \\sqrt{(x_1 - x_2)^2} = \\sqrt{S^2 - 4P}$
- $D = \\frac{1}{x_1} + \\frac{1}{x_2} = \\frac{x_1 + x_2}{x_1 x_2} = \\frac{S}{P}$

#### 3. Thống kê và Xác suất (Chương trình mới GDPT 2018)
- **Tần số tương đối:** $f_i = \\frac{n_i}{N} \\cdot 100\\%$ ($n_i$ là tần số của giá trị $x_i$, $N$ là tổng dung lượng mẫu).
- **Xác suất của biến cố $E$ trong mô hình đồng khả năng:**
  $$P(E) = \\frac{n(E)}{n(\\Omega)}$$`,
        `1. $\\Delta = b^2 - 4ac; \\quad \\Delta' = b'^2 - ac$ với $b = 2b'$
2. Hệ thức Vi-ét: $x_1 + x_2 = -\\frac{b}{a}; \\quad x_1 x_2 = \\frac{c}{a}$
3. Hai số $u, v$ có tổng $u + v = S$ và tích $u \\cdot v = P$ là nghiệm của: $X^2 - SX + P = 0$ ($S^2 \\ge 4P$)
4. Tần số tương đối: $f_i = \\frac{n_i}{N} \\times 100\\%$; Tổng các tần số tương đối bằng $100\\%$.`,
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        null,
        ch13.id,
        1,
        classId,
        teacherId
      );
      console.log('✅ Đã nạp bài giảng Ôn tập Giữa HK2');
    }
  }

  // --- BÀI GIẢNG 4: ÔN TẬP CUỐI HK2 & VÀO 10 ---
  if (ch14) {
    const hasLesson = db.prepare('SELECT id FROM lessons WHERE chapter_id = ?').get(ch14.id);
    if (!hasLesson) {
      insertLesson.run(
        'Đề cương Tổng ôn Cuối năm & Chiến lược giải đề thi Tuyển sinh vào lớp 10',
        'Ôn tập kiểm tra',
        'Tổng ôn toàn diện 10 chương Toán 9: 4 dấu hiệu nhận biết tứ giác nội tiếp kinh điển, công thức diện tích - thể tích hình trụ/nón/cầu thực tế và cấu trúc ma trận đề thi vào 10 chuẩn 5 câu.',
        `### I. Bản đồ Chiến lược 5 Câu Đề thi Tuyển sinh vào Lớp 10

1. **Câu I (2.0 điểm): Căn thức và Biểu thức Đại số**
   - Rút gọn biểu thức $A, B$ chứa căn thức bậc hai.
   - Tìm giá trị của biến để biểu thức thỏa mãn điều kiện so sánh, phương trình, bất phương trình hoặc nhận giá trị nguyên.

2. **Câu II (2.0 điểm): Phương trình - Hệ phương trình & Hình học Thực tế**
   - **Ý 1 (1.5 điểm):** Giải bài toán bằng cách lập hệ phương trình hoặc phương trình (toán chuyển động, năng suất, tỷ lệ phần trăm).
   - **Ý 2 (0.5 điểm):** Bài toán thực tế về hình khối (tính lượng sơn phủ bể nước hình trụ, lượng nước trong cốc nón, diện tích da bọc quả bóng cầu).

3. **Câu III (2.5 điểm): Hệ phương trình & Đồ thị Vi-ét**
   - **Ý 1 (1.0 điểm):** Giải hệ phương trình quy về bậc nhất bằng cách đặt ẩn phụ.
   - **Ý 2 (1.5 điểm):** Cho Parabol $(P): y = ax^2$ và đường thẳng $(d): y = mx + n$. Tìm tham số $m$ để $(d)$ cắt $(P)$ tại 2 điểm thỏa mãn điều kiện đại số/hình học.

4. **Câu IV (3.0 điểm): Hình học Đường tròn & Tứ giác nội tiếp**
   - **Câu a (1.0 điểm):** Chứng minh 4 điểm cùng thuộc đường tròn (tứ giác nội tiếp).
   - **Câu b (1.0 điểm):** Chứng minh tích đoạn thẳng bằng nhau ($MA \\cdot MB = MC \\cdot MD$) hoặc chứng minh hệ thức góc.
   - **Câu c (1.0 điểm):** Chứng minh 3 điểm thẳng hàng, 3 đường đồng quy, tiếp tuyến hoặc bài toán cực trị hình học.

5. **Câu V (0.5 điểm): Phân loại học sinh giỏi (9.5 - 10 điểm)**
   - Bất đẳng thức AM-GM, Cauchy-Schwarz, kỹ thuật chọn điểm rơi hoặc giải phương trình nghiệm nguyên / vô tỉ.`,
        `1. Tứ giác nội tiếp:
   - Dấu hiệu 1: Tổng hai góc đối bằng $180^\\circ$ ($\\widehat{A} + \\widehat{C} = 180^\\circ$).
   - Dấu hiệu 2: Hai đỉnh kề nhau cùng nhìn một cạnh chứa hai đỉnh còn lại dưới hai góc bằng nhau.
   - Dấu hiệu 3: Góc ngoài tại một đỉnh bằng góc trong tại đỉnh đối diện.
   - Dấu hiệu 4: Bốn đỉnh cách đều một điểm $O$ cố định.
2. Công thức Hình khối Thực tế:
   - Hình trụ: $S_{xq} = 2\\pi r h; \\quad V = \\pi r^2 h$
   - Hình nón: $S_{xq} = \\pi r l; \\quad V = \\frac{1}{3}\\pi r^2 h \\quad (l^2 = r^2 + h^2)$
   - Hình cầu: $S = 4\\pi R^2; \\quad V = \\frac{4}{3}\\pi R^3$`,
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
        null,
        ch14.id,
        1,
        classId,
        teacherId
      );
      console.log('✅ Đã nạp bài giảng Ôn tập Cuối HK2 & Vào 10');
    }
  }

  // 3. Thêm 4 Đề kiểm tra trực tuyến vào bảng assignments (cho học sinh làm thử)
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (title, content, max_score, time_limit_minutes, due_date, allow_resubmit, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTarget = db.prepare(`
    INSERT INTO assignment_targets (assignment_id, target_type, target_id)
    VALUES (?, 'class', ?)
  `);

  const insertRubric = db.prepare(`
    INSERT INTO rubrics (assignment_id, criteria_name, description, max_score, order_index)
    VALUES (?, ?, ?, ?, ?)
  `);

  const mockExams = [
    {
      title: '🎯 [Ôn tập Giữa kỳ 1] Đề kiểm tra Toán 9 (90 phút)',
      time_limit: 90,
      due_date: '2026-11-20T23:59',
      content: `### ĐỀ KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 1 - MÔN TOÁN 9
*Thời gian làm bài: 90 phút (Không kể thời gian phát đề)*

---

**Bài 1 (2.0 điểm):** Cho hai biểu thức:
$$A = \\frac{\\sqrt{x} + 2}{\\sqrt{x} - 3} \\quad \\text{và} \\quad B = \\frac{2\\sqrt{x}}{\\sqrt{x} + 3} + \\frac{\\sqrt{x} + 1}{\\sqrt{x} - 3} - \\frac{3 - 11\\sqrt{x}}{9 - x} \\quad (x \\ge 0, x \\ne 9)$$
1. Tính giá trị của biểu thức $A$ khi $x = 25$.
2. Rút gọn biểu thức $B$.
3. Cho $P = \\frac{B}{A}$. Tìm các giá trị của $x$ để $P < \\frac{1}{2}$.

**Bài 2 (2.0 điểm):** Giải bài toán bằng cách lập hệ phương trình:
Một xưởng may theo kế hoạch phải may 1200 bộ quần áo trong một thời gian quy định. Khi thực hiện, nhờ cải tiến kỹ thuật, mỗi ngày xưởng đã may được nhiều hơn 10 bộ quần áo so với số bộ quần áo phải may trong một ngày theo kế hoạch. Vì thế, xưởng đã hoàn thành kế hoạch trước 4 ngày. Hỏi theo kế hoạch, mỗi ngày xưởng may phải may bao nhiêu bộ quần áo?

**Bài 3 (1.5 điểm):**
1. Giải hệ phương trình: $\\begin{cases} 2x + 3y = 7 \\\\ 3x - y = 5 \\end{cases}$
2. Giải phương trình: $\\sqrt{4x - 8} - 2\\sqrt{\\frac{x - 2}{4}} = 3$

**Bài 4 (3.5 điểm):** Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$ ($H \\in BC$). Biết $AB = 6\\text{ cm}, AC = 8\\text{ cm}$.
1. Tính độ dài $BC, AH, BH$ và $\\cos \\widehat{B}$.
2. Gọi $E, F$ lần lượt là hình chiếu của $H$ trên $AB$ và $AC$. Chứng minh tứ giác $AEHF$ là hình chữ nhật và $AE \\cdot AB = AF \\cdot AC$.
3. Chứng minh $AH^3 = BC \\cdot BE \\cdot CF$.

**Bài 5 (1.0 điểm):** Cho hai số thực dương $x, y$ thỏa mãn $x + y \\le 2$. Tìm giá trị nhỏ nhất của biểu thức:
$$M = \\frac{1}{x^2 + y^2} + \\frac{2}{xy} + 3xy$$`,
      rubrics: [
        { name: 'Bài 1: Căn thức và rút gọn', max: 2.0, desc: 'Tính đúng A (0.5đ), rút gọn B (1.0đ), tìm x thỏa mãn P < 1/2 (0.5đ)' },
        { name: 'Bài 2: Giải toán lập hệ PT', max: 2.0, desc: 'Chọn ẩn đặt điều kiện (0.5đ), lập được hệ PT (0.75đ), giải và kết luận (0.75đ)' },
        { name: 'Bài 3: Hệ PT và giải PT căn thức', max: 1.5, desc: 'Giải đúng hệ PT (0.75đ), giải đúng PT căn thức (0.75đ)' },
        { name: 'Bài 4: Hình học hệ thức lượng', max: 3.5, desc: 'Tính đúng BC, AH, cos B (1.25đ), chứng minh AE.AB=AF.AC (1.25đ), chứng minh đẳng thức tích (1.0đ)' },
        { name: 'Bài 5: Bất đẳng thức cực trị', max: 1.0, desc: 'Tách ghép Cô-si chọn điểm rơi đúng và tìm min M (1.0đ)' }
      ]
    },
    {
      title: '🎯 [Ôn tập Cuối kỳ 1] Đề kiểm tra học kỳ 1 Toán 9 (90 phút)',
      time_limit: 90,
      due_date: '2026-12-30T23:59',
      content: `### ĐỀ KIỂM TRA ĐÁNH GIÁ CUỐI HỌC KỲ 1 - MÔN TOÁN 9
*Thời gian làm bài: 90 phút (Không kể thời gian phát đề)*

---

**Bài 1 (2.0 điểm):** Cho hai biểu thức $A = \\frac{\\sqrt{x}}{\\sqrt{x} - 2}$ và $B = \\frac{\\sqrt{x} + 2}{\\sqrt{x} - 2} - \\frac{\\sqrt{x} - 2}{\\sqrt{x} + 2} - \\frac{16}{x - 4}$ với $x \\ge 0, x \\ne 4$.
1. Tính giá trị của $A$ khi $x = 16$.
2. Rút gọn biểu thức $B$.
3. Tìm $x$ để biểu thức $M = \\frac{B}{A}$ có giá trị nguyên.

**Bài 2 (2.0 điểm):**
1. Giải bất phương trình: $3x - 2 \\ge 5x + 8$.
2. Hai đội công nhân cùng làm một công việc trong 12 ngày thì xong. Nếu đội thứ nhất làm trong 4 ngày rồi nghỉ, đội thứ hai tiếp tục làm tiếp trong 10 ngày nữa thì cả hai đội hoàn thành được $\\frac{7}{12}$ công việc. Hỏi nếu làm một mình thì mỗi đội hoàn thành công việc trong bao lâu?

**Bài 3 (1.5 điểm):** Cho hàm số bậc nhất $y = (m - 1)x + 2$ (với $m \\ne 1$) có đồ thị là đường thẳng $(d)$.
1. Tìm $m$ để đường thẳng $(d)$ song song với đường thẳng $y = 2x - 3$.
2. Vẽ đồ thị hàm số khi $m = 2$ và tính diện tích tam giác tạo bởi đường thẳng đó với hai trục tọa độ $Ox, Oy$.

**Bài 4 (3.5 điểm):** Cho nửa đường tròn tâm $O$ đường kính $AB = 2R$. Vẽ các tiếp tuyến $Ax, By$ với nửa đường tròn. Từ một điểm $M$ trên nửa đường tròn ($M$ khác $A$ và $B$), vẽ tiếp tuyến thứ ba cắt $Ax, By$ lần lượt tại $C$ và $D$.
1. Chứng minh tứ giác $AOMC$ nội tiếp và $CD = AC + BD$.
2. Chứng minh tam giác $COD$ vuông và $AC \\cdot BD = R^2$.
3. Gọi $N$ là giao điểm của $AD$ và $BC$. Chứng minh $MN \\parallel AC$.

**Bài 5 (1.0 điểm):** Cho các số thực dương $a, b, c$ thỏa mãn $a + b + c = 3$. Tìm giá trị lớn nhất của:
$$P = \\frac{ab}{a + 3b + 2c} + \\frac{bc}{b + 3c + 2a} + \\frac{ca}{c + 3a + 2b}$$`,
      rubrics: [
        { name: 'Bài 1: Căn thức và rút gọn', max: 2.0, desc: 'Tính đúng A (0.5đ), rút gọn B (1.0đ), tìm x nguyên để M nguyên (0.5đ)' },
        { name: 'Bài 2: Bất phương trình & toán thực tế', max: 2.0, desc: 'Giải đúng BPT (0.5đ), giải bài toán làm chung làm riêng (1.5đ)' },
        { name: 'Bài 3: Hàm số bậc nhất và đồ thị', max: 1.5, desc: 'Tìm m song song (0.75đ), vẽ đồ thị và tính diện tích tam giác (0.75đ)' },
        { name: 'Bài 4: Hình học đường tròn & tiếp tuyến', max: 3.5, desc: 'Chứng minh CD = AC + BD (1.25đ), chứng minh tam giác vuông và tích AC.BD (1.25đ), chứng minh MN song song AC (1.0đ)' },
        { name: 'Bài 5: Bất đẳng thức nâng cao', max: 1.0, desc: 'Áp dụng BĐT Cauchy-Schwarz tìm max P (1.0đ)' }
      ]
    },
    {
      title: '🎯 [Ôn tập Giữa kỳ 2] Đề kiểm tra học kỳ 2 Toán 9 (90 phút)',
      time_limit: 90,
      due_date: '2027-03-25T23:59',
      content: `### ĐỀ KIỂM TRA ĐÁNH GIÁ GIỮA HỌC KỲ 2 - MÔN TOÁN 9
*Thời gian làm bài: 90 phút (Không kể thời gian phát đề)*

---

**Bài 1 (2.0 điểm):**
1. Giải phương trình: $2x^2 - 7x + 3 = 0$.
2. Giải hệ phương trình: $\\begin{cases} \\frac{2}{x - 1} + \\frac{1}{y + 2} = 5 \\\\ \\frac{3}{x - 1} - \\frac{2}{y + 2} = 4 \\end{cases}$

**Bài 2 (2.0 điểm):** Cho Parabol $(P): y = x^2$ và đường thẳng $(d): y = 2(m - 1)x - 2m + 5$.
1. Với $m = 2$, tìm tọa độ các giao điểm của $(d)$ và $(P)$.
2. Tìm $m$ để đường thẳng $(d)$ cắt Parabol $(P)$ tại hai điểm phân biệt có hoành độ $x_1, x_2$ thỏa mãn:
   $$x_1^2 + x_2^2 + 2x_1 x_2 = 16$$

**Bài 3 (1.5 điểm):** Thống kê & Xác suất:
Một hộp chứa 20 tấm thẻ cùng loại được đánh số từ 1 đến 20. Rút ngẫu nhiên một tấm thẻ từ hộp.
1. Tính xác suất của biến cố $A$: "Số ghi trên thẻ là số chẵn chia hết cho 3".
2. Tính xác suất của biến cố $B$: "Số ghi trên thẻ là số nguyên tố".
3. Thầy giáo khảo sát điểm kiểm tra 40 học sinh lớp 9A và thu được số liệu sau: Điểm 8 có 14 học sinh, Điểm 9 có 10 học sinh, Điểm 10 có 6 học sinh, các điểm còn lại dưới 8. Lập bảng tần số tương đối cho các mức điểm từ 8 trở lên.

**Bài 4 (3.5 điểm):** Cho đường tròn $(O; R)$ và một điểm $A$ nằm ngoài đường tròn. Từ $A$ kẻ hai tiếp tuyến $AB, AC$ với $(O)$ ($B, C$ là các tiếp điểm).
1. Chứng minh tứ giác $ABOC$ nội tiếp đường tròn.
2. Vẽ cát tuyến $ADE$ của $(O)$ ($D$ nằm giữa $A$ và $E$). Chứng minh $AB^2 = AD \\cdot AE$.
3. Gọi $H$ là giao điểm của $OA$ và $BC$. Chứng minh tứ giác $ODHE$ nội tiếp.

**Bài 5 (1.0 điểm):** Giải phương trình:
$$x^2 + 4x + 7 = (x + 4)\\sqrt{x^2 + 7}$$`,
      rubrics: [
        { name: 'Bài 1: Giải PT bậc hai & hệ PT', max: 2.0, desc: 'Giải đúng PT bậc hai (1.0đ), giải đúng hệ PT đặt ẩn phụ (1.0đ)' },
        { name: 'Bài 2: Tương giao Parabol & Vi-ét', max: 2.0, desc: 'Tìm đúng tọa độ giao điểm khi m=2 (1.0đ), định lý Vi-ét tìm m thỏa mãn đẳng thức (1.0đ)' },
        { name: 'Bài 3: Thống kê & Xác suất', max: 1.5, desc: 'Tính xác suất biến cố A (0.5đ), biến cố B (0.5đ), bảng tần số tương đối (0.5đ)' },
        { name: 'Bài 4: Hình học tứ giác nội tiếp', max: 3.5, desc: 'Chứng minh ABOC nội tiếp (1.25đ), chứng minh AB^2 = AD.AE (1.25đ), chứng minh ODHE nội tiếp (1.0đ)' },
        { name: 'Bài 5: Phương trình nâng cao', max: 1.0, desc: 'Đặt ẩn phụ hoặc phân tích nhân tử tìm nghiệm chính xác (1.0đ)' }
      ]
    },
    {
      title: '🎯 [Ôn tập Cuối kỳ 2] Đề thi thử Tuyển sinh vào lớp 10 THPT (120 phút)',
      time_limit: 120,
      due_date: '2027-05-30T23:59',
      content: `### ĐỀ THI TUYỂN SINH VÀO LỚP 10 THPT - MÔN TOÁN 9 (ĐỀ SỐ 01)
*Thời gian làm bài: 120 phút (Không kể thời gian phát đề)*

---

**Bài I (2.0 điểm):** Cho hai biểu thức:
$$A = \\frac{x + 7}{\\sqrt{x}} \\quad \\text{và} \\quad B = \\frac{\\sqrt{x}}{\\sqrt{x} + 3} + \\frac{2\\sqrt{x} - 1}{\\sqrt{x} - 3} - \\frac{2x - \\sqrt{x} - 3}{x - 9} \\quad (x > 0, x \\ne 9)$$
1. Tính giá trị của biểu thức $A$ khi $x = 4$.
2. Rút gọn biểu thức $B$.
3. Tìm các giá trị nguyên của $x$ để biểu thức $P = A \\cdot B$ nhận giá trị nguyên nhỏ nhất.

**Bài II (2.0 điểm):**
1. *Giải bài toán bằng cách lập hệ phương trình:*
   Một canô xuôi dòng một khúc sông dài $90\\text{ km}$ rồi ngược dòng khúc sông đó $36\\text{ km}$, tổng thời gian hết $5$ giờ. Biết vận tốc dòng nước là $3\\text{ km/h}$. Tính vận tốc thực của canô khi nước yên lặng.
2. *Bài toán thực tế hình khối:*
   Một bồn chứa nước sinh hoạt bằng inox có dạng hình trụ với đường kính đáy bằng $1.2\\text{ m}$ và chiều cao bằng $1.8\\text{ m}$. Hỏi bồn nước đó có thể chứa tối đa bao nhiêu lít nước? (Lấy $\\pi \\approx 3.14$, làm tròn kết quả đến hàng đơn vị).

**Bài III (2.5 điểm):**
1. Giải hệ phương trình: $\\begin{cases} \\frac{3}{x} - \\frac{2}{y - 1} = 1 \\\\ \\frac{1}{x} + \\frac{3}{y - 1} = 4 \\end{cases}$
2. Trong mặt phẳng tọa độ $Oxy$, cho Parabol $(P): y = x^2$ và đường thẳng $(d): y = 2(m + 1)x - 2m$.
   a) Chứng minh $(d)$ luôn cắt $(P)$ tại hai điểm phân biệt với mọi giá trị của $m$.
   b) Gọi $x_1, x_2$ là hoành độ hai giao điểm. Tìm $m$ để:
      $$\\frac{1}{x_1} + \\frac{1}{x_2} = \\frac{x_1 + x_2}{2}$$

**Bài IV (3.0 điểm):** Cho đường tròn $(O; R)$ có đường kính $AB$. Lấy điểm $C$ thuộc $(O)$ sao cho $AC < BC$. Tiếp tuyến tại $A$ của $(O)$ cắt tia $BC$ tại $M$.
1. Chứng minh tam giác $ABC$ vuông tại $C$ và $AC^2 = BC \\cdot CM$.
2. Từ $M$ kẻ tiếp tuyến thứ hai $MD$ với $(O)$ ($D$ là tiếp điểm). Chứng minh $4$ điểm $A, M, D, O$ cùng thuộc một đường tròn.
3. Kẻ $CH \\perp AB$ tại $H$. Gọi $I$ là giao điểm của $MB$ và $CH$. Chứng minh $I$ là trung điểm của $CH$.

**Bài V (0.5 điểm):** Cho các số thực dương $x, y, z$ thỏa mãn $xy + yz + zx = 3$. Tìm giá trị nhỏ nhất của:
$$Q = \\frac{x^3}{y + 2z} + \\frac{y^3}{z + 2x} + \\frac{z^3}{x + 2y}$$`,
      rubrics: [
        { name: 'Bài I: Căn thức đại số', max: 2.0, desc: 'Tính A khi x=4 (0.5đ), rút gọn B đúng (1.0đ), tìm x để P nguyên nhỏ nhất (0.5đ)' },
        { name: 'Bài II: Giải toán thực tế & hình trụ', max: 2.0, desc: 'Toán chuyển động ca-nô xuôi ngược dòng (1.5đ), thể tích bồn inox hình trụ (0.5đ)' },
        { name: 'Bài III: Hệ phương trình & Vi-ét', max: 2.5, desc: 'Giải hệ PT đặt ẩn phụ (1.0đ), chứng minh d cắt P với mọi m (0.75đ), tìm m thỏa đẳng thức Vi-ét (0.75đ)' },
        { name: 'Bài IV: Hình học đường tròn tổng hợp', max: 3.0, desc: 'Chứng minh tam giác vuông và AC^2 = BC.CM (1.0đ), chứng minh AMDO nội tiếp (1.0đ), chứng minh I là trung điểm CH (1.0đ)' },
        { name: 'Bài V: Bất đẳng thức phân loại 10 điểm', max: 0.5, desc: 'Áp dụng BĐT Cauchy-Schwarz hoặc Cô-si ngược dấu tìm min Q = 1 (0.5đ)' }
      ]
    }
  ];

  mockExams.forEach(exam => {
    const existing = db.prepare('SELECT id FROM assignments WHERE title = ?').get(exam.title);
    if (!existing) {
      const res = insertAssignment.run(
        exam.title,
        exam.content,
        10.0,
        exam.time_limit,
        exam.due_date,
        1,
        teacherId
      );
      const assignmentId = res.lastInsertRowid;

      if (classId) {
        insertTarget.run(assignmentId, classId);
      }

      exam.rubrics.forEach((rubric, idx) => {
        insertRubric.run(assignmentId, rubric.name, rubric.desc, rubric.max, idx + 1);
      });

      console.log('✅ Đã tạo đề kiểm tra: ' + exam.title);
    } else {
      console.log('ℹ️ Đã có đề kiểm tra: ' + exam.title);
    }
  });

  console.log('\n🎉 Nạp hoàn tất phần Ôn tập Giữa kỳ và Cuối kỳ!');
}

seedReviews();
