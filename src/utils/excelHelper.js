const ExcelJS = require('exceljs');

/**
 * Đọc danh sách học sinh từ file Excel hoặc CSV
 * @param {string} filePath Đường dẫn file
 * @returns {Promise<Array<{full_name: string, username: string, password?: string, class_code?: string}>>}
 */
async function parseStudentsFromExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  if (filePath.endsWith('.csv')) {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có sheet nào.');
  }

  const students = [];
  // Giả định dòng 1 là tiêu đề: Họ và tên, Tên đăng nhập, Mật khẩu, Mã lớp
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Bỏ qua tiêu đề

    const fullName = String(row.getCell(1).value || '').trim();
    const username = String(row.getCell(2).value || '').trim();
    const password = String(row.getCell(3).value || '').trim() || 'Hocsinh@123';
    const classCode = String(row.getCell(4).value || '').trim();

    if (fullName && username) {
      students.push({
        full_name: fullName,
        username: username.toLowerCase(),
        password: password,
        class_code: classCode
      });
    }
  });

  return students;
}

/**
 * Tạo file mẫu Excel để giáo viên nhập danh sách học sinh
 * @returns {Promise<Buffer>}
 */
async function generateStudentImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DanhSachHocSinh');

  worksheet.columns = [
    { header: 'Họ và tên (*)', key: 'full_name', width: 28 },
    { header: 'Tên đăng nhập (*)', key: 'username', width: 22 },
    { header: 'Mật khẩu (mặc định Hocsinh@123 nếu để trống)', key: 'password', width: 35 },
    { header: 'Mã lớp (VD: TOAN9A)', key: 'class_code', width: 20 }
  ];

  // Dữ liệu mẫu minh họa
  worksheet.addRow({ full_name: 'Trần Văn Bình', username: 'hs_tranvanb', password: 'Hocsinh@123', class_code: 'TOAN9A' });
  worksheet.addRow({ full_name: 'Lê Thị Cúc', username: 'hs_lethic', password: 'Hocsinh@123', class_code: 'TOAN9A' });
  worksheet.addRow({ full_name: 'Phạm Văn Dũng', username: 'hs_phamvand', password: 'Hocsinh@123', class_code: 'TOAN9A' });

  // Định dạng hàng tiêu đề
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Xanh dương đậm
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Xuất bảng điểm bài tập ra file Excel
 * @param {Object} data Dữ liệu bài tập, rubric và kết quả làm bài của học sinh
 * @returns {Promise<Buffer>}
 */
async function exportGradebookToExcel({ assignment, rubrics, submissions }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'He Thong Tu Luan Toan THCS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Bảng Điểm');

  // Tiêu đề lớn
  worksheet.mergeCells('A1', 'F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `DANH SÁCH BÀI NỘP VÀ NHẬN XÉT: ${assignment.title.toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Thông tin phụ
  worksheet.mergeCells('A2', 'F2');
  const infoCell = worksheet.getCell('A2');
  infoCell.value = `Hạn nộp: ${assignment.due_date} | Thời gian làm bài: ${assignment.time_limit_minutes ? assignment.time_limit_minutes + ' phút' : 'Không giới hạn'}`;
  infoCell.font = { italic: true, size: 11 };
  infoCell.alignment = { horizontal: 'center' };
  worksheet.getRow(2).height = 22;

  // Cấu hình các cột
  const columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên đăng nhập', key: 'username', width: 18 },
    { header: 'Họ và tên học sinh', key: 'full_name', width: 26 },
    { header: 'Lớp', key: 'class_name', width: 16 },
    { header: 'Trạng thái', key: 'status_text', width: 22 },
    { header: 'Thời gian nộp', key: 'submitted_at', width: 22 },
    { header: 'Nhận xét của Giáo viên', key: 'feedback', width: 45 }
  ];

  worksheet.getRow(4).values = columns.map(c => c.header);
  worksheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  worksheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(4).height = 28;

  // Ghi từng dòng học sinh
  submissions.forEach((item, index) => {
    const rowValues = [
      index + 1,
      item.username,
      item.full_name,
      item.class_name || 'Tự do',
      item.status_display,
      item.submitted_at || 'Chưa nộp',
      item.feedback || ''
    ];

    const addedRow = worksheet.addRow(rowValues);
    addedRow.alignment = { vertical: 'middle' };

    // Căn giữa cột STT và Trạng thái
    addedRow.getCell(1).alignment = { horizontal: 'center' };
    addedRow.getCell(5).alignment = { horizontal: 'center' };
  });

  // Kẻ viền (Borders) cho toàn bộ bảng
  const rowCount = 4 + submissions.length;
  const colCount = columns.length;
  for (let r = 4; r <= rowCount; r++) {
    for (let c = 1; c <= colCount; c++) {
      worksheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }

  // Tự động căn chỉnh độ rộng cột
  columns.forEach((col, index) => {
    worksheet.getColumn(index + 1).width = col.width || 18;
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  parseStudentsFromExcel,
  generateStudentImportTemplate,
  exportGradebookToExcel
};
