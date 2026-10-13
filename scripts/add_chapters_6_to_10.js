const db = require('../src/database/db');

function addChapters() {
  let teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' LIMIT 1").get();
  const teacherId = teacher ? teacher.id : 1;

  const newChapters = [
    {
      title: 'Chương 6: Hàm số y = ax² (a ≠ 0). Phương trình bậc hai một ẩn',
      description: 'Hàm số y = ax² (a ≠ 0), đồ thị Parabol, phương trình bậc hai một ẩn, công thức nghiệm và định lý Vi-ét ứng dụng ôn thi vào 10.',
      order_index: 6
    },
    {
      title: 'Chương 7: Tần số và tần số tương đối',
      description: 'Bảng tần số, bảng tần số tương đối, biểu đồ tần số tương đối, biểu đồ đoạn thẳng và biểu đồ hình quạt tròn biểu diễn mẫu số liệu.',
      order_index: 7
    },
    {
      title: 'Chương 8: Xác suất của biến cố trong một số mô hình xác suất đơn giản',
      description: 'Không gian mẫu, biến cố ngẫu nhiên, xác suất của biến cố trong một số mô hình xác suất đơn giản (tung đồng xu, xúc xắc, rút thẻ...).',
      order_index: 8
    },
    {
      title: 'Chương 9: Đường tròn ngoại tiếp và đường tròn nội tiếp',
      description: 'Đường tròn ngoại tiếp và nội tiếp tam giác, tứ giác nội tiếp đường tròn, đa giác đều và các bài toán hình học ôn thi vào 10.',
      order_index: 9
    },
    {
      title: 'Chương 10: Một số hình khối trong thực tiễn',
      description: 'Hình trụ, hình nón, hình cầu, công thức tính diện tích xung quanh, diện tích toàn phần, thể tích và các bài toán thực tế.',
      order_index: 10
    }
  ];

  const insertStmt = db.prepare('INSERT INTO chapters (title, description, order_index, class_id, created_by) VALUES (?, ?, ?, NULL, ?)');

  newChapters.forEach(c => {
    const existing = db.prepare('SELECT id FROM chapters WHERE title LIKE ?').get(`%Chương ${c.order_index}%`);
    if (!existing) {
      insertStmt.run(c.title, c.description, c.order_index, teacherId);
      console.log('✅ Đã thêm: ' + c.title);
    } else {
      console.log('ℹ️ Đã tồn tại: ' + c.title);
    }
  });

  // Cập nhật lại Chuyên đề 2 (Phương trình bậc hai & Vi-ét) vào Chương 6
  const ch6 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 6%' LIMIT 1").get();
  if (ch6) {
    db.prepare("UPDATE lessons SET chapter_id = ?, order_index = 1 WHERE title LIKE '%Vi-ét%'").run(ch6.id);
    console.log('✅ Đã liên kết Chuyên đề 2 (Vi-ét) vào Chương 6.');
  }

  // Cập nhật Chuyên đề 3 (Tứ giác nội tiếp) vào Chương 9
  const ch9 = db.prepare("SELECT id FROM chapters WHERE title LIKE '%Chương 9%' LIMIT 1").get();
  if (ch9) {
    db.prepare("UPDATE lessons SET chapter_id = ?, order_index = 1 WHERE title LIKE '%Tứ giác nội tiếp%'").run(ch9.id);
    console.log('✅ Đã liên kết Chuyên đề 3 (Tứ giác nội tiếp) vào Chương 9.');
  }

  // Cập nhật lại mô tả Chương 2 cho chuẩn chương trình
  db.prepare(`
    UPDATE chapters 
    SET description = 'Bất đẳng thức, bất phương trình bậc nhất một ẩn và các kỹ thuật chứng minh bất đẳng thức ôn thi vào 10.' 
    WHERE title LIKE '%Chương 2%'
  `).run();

  // In danh sách các chương hiện tại
  const allChapters = db.prepare('SELECT id, title, order_index, (SELECT COUNT(*) FROM lessons WHERE chapter_id = chapters.id) as lesson_count FROM chapters ORDER BY order_index ASC').all();
  console.log('\n📚 DANH SÁCH TẤT CẢ 10 CHƯƠNG HỌC HIỆN TẠI:');
  allChapters.forEach(c => {
    console.log(`[${c.order_index}] ${c.title} (${c.lesson_count} bài học)`);
  });
}

addChapters();
