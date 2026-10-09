const mammoth = require('mammoth');
const path = require('path');

/**
 * Phân tích nội dung đề thi từ chuỗi văn bản trích xuất từ file Word
 * @param {string} rawText 
 * @param {string} filename 
 * @returns {{ title: string, questions: Array<{ title: string, content: string, score: number }> }}
 */
function parseWordExamText(rawText, filename = '') {
  if (!rawText || !rawText.trim()) {
    return { title: filename ? cleanFilename(filename) : 'Đề bài tập tự luận Toán', questions: [] };
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { title: '', questions: [] };

  // 1. Nhận diện tiêu đề đề thi ở các dòng đầu
  let title = '';
  let startIndex = 0;

  const headerKeywords = [
    'ĐỀ THI', 'BÀI TẬP', 'ĐỀ KIỂM TRA', 'KIỂM TRA', 'PHIẾU HỌC TẬP',
    'ĐỀ ÔN TẬP', 'TOÁN', 'ĐỀ SỐ', 'HỌC KỲ', 'HỌC KÌ', 'KHẢO SÁT'
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const upper = lines[i].toUpperCase();
    const isQuestionLine = lines[i].match(/^(Câu|Bài|Phần)\s*(\d+|[IVXLCDM]+)/i);
    if (!isQuestionLine && headerKeywords.some(kw => upper.includes(kw))) {
      title = lines[i];
      startIndex = i + 1;
      break;
    }
  }

  if (!title) {
    title = filename ? cleanFilename(filename) : 'Đề bài tập tự luận Toán';
  }

  // 2. Nhận diện các câu hỏi
  // Regex bắt các dạng:
  // - "Câu 1:", "Câu 1.", "Câu 1 -", "Câu 1 (2,0 điểm):", "Câu 1 (2.0 đ):"
  // - "Bài 1:", "Bài 1 (2 điểm):"
  // - "Câu I:", "Bài I (2,5 điểm):"
  const questionHeaderRegex = /^(Câu|Bài|Phần)\s*(\d+|[IVXLCDM]+)[\s:.\-\)]*(?:\(([\d.,]+)\s*(?:đ|điểm|đ\.)?\))?[\s:.\-]*(.*)$/i;

  const questions = [];
  let currentQ = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(questionHeaderRegex);

    if (match) {
      if (currentQ) {
        questions.push(currentQ);
      }

      const qPrefix = match[1]; // 'Câu', 'Bài', 'Phần'
      const qNum = match[2];
      const qScoreStr = match[3];
      const remainingHeader = match[4] ? match[4].trim() : '';

      let score = 2.0;
      if (qScoreStr) {
        const parsed = parseFloat(qScoreStr.replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) score = parsed;
      }

      currentQ = {
        title: `${qPrefix} ${qNum}${qScoreStr ? ` (${score} điểm)` : ''}`,
        contentLines: remainingHeader ? [remainingHeader] : [],
        score: score
      };
    } else {
      if (currentQ) {
        currentQ.contentLines.push(line);
      } else {
        // Dòng phụ trước khi bắt đầu câu 1 (ví dụ thông tin thời gian, môn học)
        if (!title || title === cleanFilename(filename)) {
          title = line;
        }
      }
    }
  }

  if (currentQ) {
    questions.push(currentQ);
  }

  // Nếu không nhận diện được regex "Câu/Bài", phân chia theo cụm đoạn văn
  if (questions.length === 0) {
    const paragraphs = rawText.split(/\n\s*\n/).map(c => c.trim()).filter(c => c.length > 15);
    paragraphs.forEach((para, idx) => {
      questions.push({
        title: `Câu ${idx + 1}`,
        content: para,
        score: 2.0
      });
    });
  } else {
    questions.forEach((q) => {
      q.content = q.contentLines.join('\n\n').trim();
      delete q.contentLines;
      if (!q.content) {
        q.content = q.title;
      }
    });
  }

  return { title, questions };
}

function cleanFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return base.replace(/[_]/g, ' ').trim();
}

/**
 * Đọc file .docx và phân tích danh sách câu hỏi
 * @param {string} filePath 
 * @param {string} originalFilename 
 */
async function parseWordFile(filePath, originalFilename = '') {
  const result = await mammoth.extractRawText({ path: filePath });
  const rawText = result.value || '';
  return parseWordExamText(rawText, originalFilename);
}

module.exports = {
  parseWordFile,
  parseWordExamText
};
