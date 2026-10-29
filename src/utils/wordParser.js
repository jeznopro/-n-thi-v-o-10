const fs = require('fs');
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
 * Đọc file .docx, tự động trích xuất hình ảnh nhúng ra đĩa và phân tích đề bằng AI Groq
 * @param {string} filePath 
 * @param {string} originalFilename 
 */
async function parseWordFile(filePath, originalFilename = '') {
  const uploadsDir = path.join(__dirname, '../../public/uploads/assignments');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let imgCounter = 0;
  const imageOptions = {
    convertImage: mammoth.images.inline(function(element) {
      imgCounter++;
      const ext = (element.contentType && (element.contentType.includes('jpeg') || element.contentType.includes('jpg'))) ? 'jpg' : 'png';
      const filename = `word_img_${Date.now()}_${imgCounter}.${ext}`;
      const diskPath = path.join(uploadsDir, filename);
      const webPath = `/uploads/assignments/${filename}`;

      return element.read().then(function(buffer) {
        try {
          fs.writeFileSync(diskPath, buffer);
        } catch (eWrite) {
          console.warn('Lỗi ghi ảnh từ Word:', eWrite.message);
        }
        return {
          src: webPath
        };
      });
    })
  };

  // 1. Chuyển đổi Word sang HTML kèm lưu toàn bộ ảnh ra thư mục uploads
  const htmlRes = await mammoth.convertToHtml({ path: filePath }, imageOptions);
  let htmlContent = htmlRes.value || '';

  // Chuyển thẻ img sang markdown hình ảnh để AI và giao diện nhận diện chuẩn
  let textWithImages = htmlContent
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, '\n![Hình ảnh minh họa]($1)\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  // 2. TÍCH HỢP AI GROQ: Bóc tách ngữ nghĩa, phân tích từng câu hỏi và chuẩn hóa KaTeX
  try {
    const { parseExamWithAi } = require('../services/aiService');
    const aiResult = await parseExamWithAi(textWithImages);

    if (aiResult && aiResult.questions && aiResult.questions.length > 0) {
      let finalTitle = aiResult.title;
      if (!finalTitle || finalTitle.includes('Đề bài tập tự luận') || finalTitle.length < 5) {
        finalTitle = originalFilename ? cleanFilename(originalFilename) : (finalTitle || 'Đề bài tập tự luận Toán');
      }

      return {
        title: finalTitle,
        time_limit_minutes: aiResult.time_limit_minutes || null,
        questions: aiResult.questions,
        aiPowered: true,
        extractedImagesCount: imgCounter
      };
    }
  } catch (aiError) {
    console.warn('AI Groq parsing failed or offline, fallback to regex parser:', aiError.message);
  }

  // 3. Fallback: Nếu AI Groq gặp sự cố, tự động dùng bộ phân tích regex truyền thống
  const fallbackResult = parseWordExamText(textWithImages, originalFilename);
  return {
    ...fallbackResult,
    aiPowered: false,
    extractedImagesCount: imgCounter
  };
}

module.exports = {
  parseWordFile,
  parseWordExamText
};
