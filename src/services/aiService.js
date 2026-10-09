const fs = require('fs');
const path = require('path');
const db = require('../database/db');

// Danh sách các Provider hỗ trợ
const PROVIDERS = {
  OFFLINE: 'offline',
  GROQ: 'groq',
  DEEPSEEK: 'deepseek',
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CUSTOM: 'custom'
};

const DEFAULT_CONFIGS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    label: 'Groq Cloud (Miễn phí 100%, siêu tốc độ, Llama 3.1)'
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    label: 'DeepSeek (Mạnh về Toán & Tiếng Việt)'
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    label: 'Ollama Cục Bộ (Chạy Offline trên máy, 0 cần Key)'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    label: 'OpenAI (ChatGPT GPT-4o-mini)'
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    label: 'Google Gemini'
  },
  offline: {
    baseUrl: '',
    model: 'built-in',
    label: 'Chế độ Nội Bộ (Không cần mạng & Không cần API Key)'
  }
};

/**
 * Lấy cấu hình AI hiện tại từ Database hoặc Biến môi trường
 */
function getAiConfig() {
  try {
    const providerRow = db.prepare("SELECT value FROM system_settings WHERE key = 'ai_provider'").get();
    const keyRow = db.prepare("SELECT value FROM system_settings WHERE key = 'ai_api_key'").get();
    const modelRow = db.prepare("SELECT value FROM system_settings WHERE key = 'ai_model'").get();
    const urlRow = db.prepare("SELECT value FROM system_settings WHERE key = 'ai_base_url'").get();
    const personaRow = db.prepare("SELECT value FROM system_settings WHERE key = 'ai_tutor_persona'").get();

    // Tương thích ngược với key cũ gemini_api_key nếu có
    const legacyKeyRow = db.prepare("SELECT value FROM system_settings WHERE key = 'gemini_api_key'").get();

    let provider = providerRow?.value?.trim() || (process.env.AI_PROVIDER || 'offline');
    let apiKey = keyRow?.value?.trim() || legacyKeyRow?.value?.trim() || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    let model = modelRow?.value?.trim() || process.env.AI_MODEL || '';
    let baseUrl = urlRow?.value?.trim() || process.env.AI_BASE_URL || '';
    let tutorPersona = personaRow?.value?.trim() || '';

    // Nếu chưa chọn model, dùng model mặc định theo provider
    if (!model && DEFAULT_CONFIGS[provider]) {
      model = DEFAULT_CONFIGS[provider].model;
    }

    if (!baseUrl && DEFAULT_CONFIGS[provider]) {
      baseUrl = DEFAULT_CONFIGS[provider].baseUrl;
    }

    const hasKey = provider === PROVIDERS.OFFLINE || provider === PROVIDERS.OLLAMA || !!apiKey;

    return {
      provider,
      apiKey,
      model,
      baseUrl,
      tutorPersona,
      hasKey,
      maskedKey: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '',
      providersList: DEFAULT_CONFIGS
    };
  } catch (error) {
    console.error('Lỗi đọc cấu hình AI:', error);
    return {
      provider: PROVIDERS.OFFLINE,
      apiKey: '',
      model: 'built-in',
      baseUrl: '',
      tutorPersona: '',
      hasKey: true,
      maskedKey: '',
      providersList: DEFAULT_CONFIGS
    };
  }
}

/**
 * Lưu cấu hình AI vào Database
 */
function saveAiConfig({ provider, apiKey, model, baseUrl, tutorPersona }) {
  const current = getAiConfig();
  const newProvider = provider || current.provider || PROVIDERS.OFFLINE;
  const newModel = model || current.model || DEFAULT_CONFIGS[newProvider]?.model || 'built-in';
  const newBaseUrl = baseUrl !== undefined ? baseUrl : (current.baseUrl || DEFAULT_CONFIGS[newProvider]?.baseUrl || '');

  const stmt = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run('ai_provider', newProvider);
  if (apiKey !== undefined && apiKey !== null) {
    stmt.run('ai_api_key', apiKey.trim());
    stmt.run('gemini_api_key', apiKey.trim()); // đồng bộ tương thích
  }
  stmt.run('ai_model', newModel);
  stmt.run('ai_base_url', newBaseUrl);
  if (tutorPersona !== undefined && tutorPersona !== null) {
    stmt.run('ai_tutor_persona', tutorPersona.trim());
  }

  return getAiConfig();
}

/**
 * Gọi API theo chuẩn OpenAI Chat Completions (Groq, DeepSeek, Ollama, OpenAI, Custom)
 */
async function callOpenAiCompatibleApi({ baseUrl, apiKey, model, messages, temperature = 0.7 }) {
  const cleanBase = (baseUrl || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const endpoint = `${cleanBase}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const payload = {
    model: model || 'llama-3.3-70b-versatile',
    messages: messages,
    temperature: temperature
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let parsed = {};
      try { parsed = JSON.parse(errText); } catch (e) {}
      const msg = parsed.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API không trả về nội dung hợp lệ.');
    }

    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Yêu cầu tới AI Server bị quá thời gian chờ (Timeout sau 45s).');
    }
    throw err;
  }
}

/**
 * Gọi REST API tới Google Gemini
 */
async function callGeminiApi({ apiKey, model, prompt, systemInstruction, imageParts = [] }) {
  const keyToUse = apiKey;
  const modelToUse = model || 'gemini-2.0-flash';

  if (!keyToUse) {
    throw new Error('Chưa cấu hình Google Gemini API Key.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${keyToUse}`;

  const parts = [];
  parts.push({ text: prompt });

  if (imageParts && imageParts.length > 0) {
    for (const img of imageParts) {
      parts.push({
        inline_data: {
          mime_type: img.mime_type,
          data: img.data
        }
      });
      if (img.caption) {
        parts.push({ text: img.caption });
      }
    }
  }

  const payload = {
    contents: [{ role: 'user', parts: parts }]
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let parsed = {};
      try { parsed = JSON.parse(errText); } catch (e) {}
      const msg = parsed.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Google Gemini Error: ${msg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts?.[0]) {
      throw new Error('Gemini không trả về nội dung hợp lệ.');
    }

    return candidate.content.parts.map(p => p.text || '').join('\n');
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Gọi Gemini REST API với nhiều lượt trao đổi (Chat)
 */
async function callGeminiChatApi({ apiKey, model, contents, systemInstruction }) {
  const keyToUse = apiKey;
  const modelToUse = model || 'gemini-2.0-flash';
  if (!keyToUse) throw new Error('Chưa cấu hình Google Gemini API Key.');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${keyToUse}`;
  const payload = {
    contents: contents
  };
  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      let parsed = {};
      try { parsed = JSON.parse(errText); } catch (e) {}
      const msg = parsed.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Google Gemini Error: ${msg}`);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts?.[0]) {
      throw new Error('Gemini không trả về nội dung hợp lệ.');
    }
    return candidate.content.parts.map(p => p.text || '').join('\n');
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Điều hướng gọi mô hình AI tổng quát
 */
async function dispatchAiCall({ systemPrompt, userPrompt, messages: customMessages, imageParts = [], overrideConfig = null }) {
  const config = overrideConfig || getAiConfig();
  const provider = config.provider || PROVIDERS.OFFLINE;

  if (provider === PROVIDERS.OFFLINE) {
    throw new Error('Hệ thống đang ở Chế độ Nội Bộ (Offline).');
  }

  if (provider === PROVIDERS.GEMINI) {
    if (customMessages && customMessages.length > 0) {
      const geminiContents = customMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      return await callGeminiChatApi({
        apiKey: config.apiKey,
        model: config.model || 'gemini-2.0-flash',
        contents: geminiContents,
        systemInstruction: systemPrompt
      });
    }

    return await callGeminiApi({
      apiKey: config.apiKey,
      model: config.model || 'gemini-2.0-flash',
      prompt: userPrompt,
      systemInstruction: systemPrompt,
      imageParts: imageParts
    });
  }

  // Cho Groq, DeepSeek, Ollama, OpenAI, Custom
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  if (customMessages && customMessages.length > 0) {
    messages.push(...customMessages);
  } else {
    // Chuẩn bị nội dung User
    if (imageParts && imageParts.length > 0 && (provider === PROVIDERS.OPENAI || provider === PROVIDERS.OLLAMA)) {
      // Multimodal cho OpenAI / Ollama Vision
      const contentArray = [{ type: 'text', text: userPrompt }];
      for (const img of imageParts) {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mime_type};base64,${img.data}`
          }
        });
      }
      messages.push({ role: 'user', content: contentArray });
    } else {
      // Model văn bản tiêu chuẩn (như Groq Llama 3.3, DeepSeek)
      let fullText = userPrompt;
      if (imageParts.length > 0) {
        fullText += `\n[Ghi chú: Bài thi có ${imageParts.length} ảnh bài giải viết tay của học sinh được đính kèm]`;
      }
      messages.push({ role: 'user', content: fullText });
    }
  }

  try {
    return await callOpenAiCompatibleApi({
      baseUrl: config.baseUrl || DEFAULT_CONFIGS[provider]?.baseUrl,
      apiKey: config.apiKey,
      model: config.model || DEFAULT_CONFIGS[provider]?.model,
      messages: messages
    });
  } catch (err) {
    if (err.message && (err.message.includes('does not exist') || err.message.includes('not have access') || err.message.includes('not found')) && provider === 'groq') {
      console.warn('Model Groq không khả dụng, tự động fallback sang llama-3.1-8b-instant...');
      return await callOpenAiCompatibleApi({
        baseUrl: config.baseUrl || DEFAULT_CONFIGS[provider]?.baseUrl,
        apiKey: config.apiKey,
        model: 'llama-3.1-8b-instant',
        messages: messages
      });
    }
    throw err;
  }
}

/**
 * Lấy danh sách các mô hình khả dụng từ tài khoản người dùng
 */
async function fetchModelsFromProvider(testConfig) {
  const provider = testConfig.provider || PROVIDERS.OFFLINE;
  const apiKey = testConfig.apiKey;
  const baseUrl = testConfig.baseUrl || DEFAULT_CONFIGS[provider]?.baseUrl;
  if (!apiKey || !baseUrl) return [];

  const cleanBase = baseUrl.replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanBase}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || [])
      .map(m => m.id)
      .filter(id => !id.includes('whisper') && !id.includes('guard'));
  } catch (e) {
    return [];
  }
}

/**
 * Kiểm tra kết nối AI (kèm tự động khắc phục nếu sai tên model)
 */
async function testAiConnection(testConfig) {
  const provider = testConfig.provider || PROVIDERS.OFFLINE;

  if (provider === PROVIDERS.OFFLINE) {
    return {
      success: true,
      provider: 'offline',
      model: 'built-in',
      reply: 'Chế độ Nội bộ sẵn sàng hoạt động ngay (Không cần API Key hay Internet)!'
    };
  }

  try {
    const reply = await dispatchAiCall({
      systemPrompt: 'Bạn là trợ lý Toán học THCS.',
      userPrompt: 'Xin chào, hãy phản hồi đúng 1 câu ngắn: "Kết nối thành công với Hệ thống Toán THCS!"',
      overrideConfig: testConfig
    });

    return {
      success: true,
      provider: provider,
      model: testConfig.model,
      reply: reply.trim()
    };
  } catch (err) {
    const isModelNotFound = err.message && (
      err.message.includes('does not exist') ||
      err.message.includes('not have access') ||
      err.message.includes('not found') ||
      err.message.includes('model_not_found')
    );

    // Nếu tên model không tồn tại hoặc tài khoản chưa được cấp quyền model 70B, tự động thử các model phổ thông (như llama-3.1-8b-instant)
    if (isModelNotFound) {
      const candidates = provider === 'groq' 
        ? ['llama-3.1-8b-instant', 'llama3-8b-8192', 'llama-3.3-70b-specdec', 'gemma2-9b-it']
        : ['gpt-4o-mini', 'deepseek-chat', 'llama3.2'];

      for (const altModel of candidates) {
        if (altModel === testConfig.model) continue;
        try {
          const altReply = await dispatchAiCall({
            systemPrompt: 'Bạn là trợ lý Toán học THCS.',
            userPrompt: 'Xin chào, hãy phản hồi đúng 1 câu ngắn: "Kết nối thành công với Hệ thống Toán THCS!"',
            overrideConfig: { ...testConfig, model: altModel }
          });

          // Tự động lưu model này vào database nếu trước đó đã lưu
          try {
            db.prepare("UPDATE system_settings SET value = ? WHERE key = 'ai_model'").run(altModel);
          } catch (eDb) {}

          return {
            success: true,
            provider: provider,
            model: altModel,
            suggestedModel: altModel,
            reply: `Đã tự động kết nối thành công với mô hình siêu tốc: "${altModel}"! (Mô hình "${testConfig.model}" chưa khả dụng trên gói tài khoản này).`
          };
        } catch (e2) {}
      }
    }

    return {
      success: false,
      provider: provider,
      error: err.message
    };
  }
}

/**
 * Bóc tách JSON từ văn bản
 */
function extractJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err2) {}
    }

    const firstSquare = text.indexOf('[');
    const lastSquare = text.lastIndexOf(']');
    if (firstSquare !== -1 && lastSquare > firstSquare) {
      try {
        return JSON.parse(text.substring(firstSquare, lastSquare + 1));
      } catch (err3) {}
    }

    const firstCurly = text.indexOf('{');
    const lastCurly = text.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly > firstCurly) {
      try {
        return JSON.parse(text.substring(firstCurly, lastCurly + 1));
      } catch (err4) {}
    }

    throw new Error('Không thể chuyển đổi phản hồi thành định dạng JSON.');
  }
}

/**
 * FEATURE 1: Soạn đề bài tự luận Toán THCS
 */
async function generateMathQuestions({ grade, topic, difficulty, count = 3, notes = '' }) {
  const config = getAiConfig();
  const safeCount = Math.max(1, Math.min(parseInt(count, 10) || 3, 5));
  const gradeLabel = grade ? `Lớp ${grade}` : 'Lớp 9';
  const topicLabel = topic || 'Rút gọn biểu thức và Hình học';
  const diffLabel = difficulty || 'Thông hiểu đến Vận dụng';

  if (config.provider === PROVIDERS.OFFLINE || (!config.hasKey && config.provider !== PROVIDERS.OLLAMA)) {
    return getCuratedFallbackQuestions(grade, topic, safeCount);
  }

  const systemPrompt = `Bạn là chuyên gia Giáo dục môn Toán THCS Việt Nam theo Chương trình GDPT mới. Luôn sử dụng ký hiệu LaTeX KaTeX kẹp giữa '$' cho mọi công thức Toán. Chỉ trả về DUY NHẤT một mảng JSON thuần túy, không thêm lời chào.`;

  const userPrompt = `
Hãy tạo ${safeCount} câu hỏi tự luận môn Toán chuẩn mực dành cho học sinh ${gradeLabel}.
- Khối lớp: ${gradeLabel}
- Chủ đề: ${topicLabel}
- Mức độ: ${diffLabel}
${notes ? `- Yêu cầu thêm của giáo viên: ${notes}` : ''}

CẤU TRÚC JSON BẮT BUỘC TRẢ VỀ:
[
  {
    "title": "Câu 1: [Tên dạng toán]",
    "content": "[Nội dung đề bài chi tiết, công thức đặt trong $...$, ngắt dòng dùng <br>]"
  }
]
`;

  try {
    const rawResponse = await dispatchAiCall({
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
    });

    const parsed = extractJsonFromText(rawResponse);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return {
        success: true,
        source: config.provider,
        model: config.model,
        questions: parsed.map((q, idx) => ({
          id: idx + 1,
          title: q.title || `Câu ${idx + 1}`,
          content: q.content || ''
        }))
      };
    } else {
      throw new Error('Dữ liệu câu hỏi trả về không phải là mảng JSON hợp lệ.');
    }
  } catch (err) {
    console.warn(`Lỗi gọi AI (${config.provider}), chuyển sang bộ câu hỏi mẫu THCS:`, err.message);
    const fallback = getCuratedFallbackQuestions(grade, topic, safeCount);
    fallback.notice = `(Đã dùng ngân hàng đề THCS chuẩn do: ${err.message})`;
    return fallback;
  }
}

/**
 * FEATURE 2: AI Phân tích bài làm & Gợi ý lời phê
 */
async function reviewSubmissionWithAi(submissionId) {
  const config = getAiConfig();

  const submission = db.prepare(`
    SELECT s.*, u.full_name AS student_name, u.username, a.title AS assignment_title, a.content AS assignment_content
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = ?
  `).get(submissionId);

  if (!submission) {
    throw new Error('Không tìm thấy bài làm cần nhận xét.');
  }

  const attachments = db.prepare(`
    SELECT * FROM attachments
    WHERE entity_type = 'submission' AND entity_id = ?
    ORDER BY question_index ASC, id ASC
  `).all(submissionId);

  let questions = [];
  try {
    if (submission.assignment_content && submission.assignment_content.trim().startsWith('[')) {
      questions = JSON.parse(submission.assignment_content);
    } else {
      questions = [{ id: 1, title: 'Đề bài', content: submission.assignment_content }];
    }
  } catch (e) {
    questions = [{ id: 1, title: 'Đề bài', content: submission.assignment_content }];
  }

  let textAnswers = {};
  try {
    if (submission.content && submission.content.trim().startsWith('{')) {
      textAnswers = JSON.parse(submission.content);
    } else {
      textAnswers = { 1: submission.content || '' };
    }
  } catch (e) {
    textAnswers = { 1: submission.content || '' };
  }

  if (config.provider === PROVIDERS.OFFLINE || (!config.hasKey && config.provider !== PROVIDERS.OLLAMA)) {
    return getHeuristicReview({
      studentName: submission.student_name,
      questions,
      textAnswers,
      attachments
    });
  }

  const imageParts = [];
  const maxImages = Math.min(attachments.length, 6);
  for (let i = 0; i < maxImages; i++) {
    const att = attachments[i];
    try {
      const fullPath = path.resolve(__dirname, '../../', att.file_path);
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        let mimeType = att.mime_type || 'image/jpeg';
        if (mimeType !== 'application/pdf') {
          imageParts.push({
            mime_type: mimeType,
            data: fileBuffer.toString('base64'),
            caption: `[Ảnh bài giải Câu ${att.question_index || (i + 1)}]: ${att.file_name}`
          });
        }
      }
    } catch (readErr) {}
  }

  const systemPrompt = `Bạn là Thầy/Cô giáo Toán THCS tận tâm tại Việt Nam. Phân tích bài làm tự luận của học sinh và đưa ra lời phê sư phạm chất lượng (KHÔNG cho điểm số).`;

  let userPrompt = `
BÀI TẬP: ${submission.assignment_title}
HỌC SINH: ${submission.student_name}
TRẠNG THÁI: ${submission.is_late ? 'Nộp muộn' : 'Đúng hạn'}

ĐỀ BÀI CÁC CÂU:
${questions.map((q, idx) => `[Câu ${idx + 1}: ${q.title}]\n${q.content.replace(/<[^>]*>/g, ' ')}`).join('\n\n')}

LỜI GIẢI GÕ VĂN BẢN:
${Object.keys(textAnswers).map(k => `[Câu ${k}]: ${textAnswers[k] || '(Chưa gõ văn bản)'}`).join('\n')}

ẢNH CHỤP BÀI GIẢI VIẾT TAY:
${attachments.length === 0 ? '- Học sinh không tải lên ảnh viết tay.' : `- Có ${attachments.length} ảnh bài giải viết tay đính kèm.`}

HƯỚNG DẪN VIẾT LỜI PHÊ (Trình bày 4 phần):
1. 🌟 Nhận xét tổng quan: Thái độ làm bài, mức độ hoàn thành.
2. ✅ Điểm mạnh: Khen ngợi phần biến đổi đúng, vẽ hình chuẩn.
3. ⚠️ Những lỗi cần lưu ý & khắc phục: Chỉ rõ lỗi sai (thiếu ĐKXĐ, nhầm dấu, quên kết luận nghiệm, thiếu ký hiệu hình học...).
4. 💡 Lời khuyên & Động viên học sinh tiếp tục cố gắng.
`;

  try {
    const reviewFeedback = await dispatchAiCall({
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      imageParts: imageParts
    });

    return {
      success: true,
      source: config.provider,
      feedback: reviewFeedback.trim(),
      attachmentCount: attachments.length
    };
  } catch (err) {
    console.warn(`Lỗi phân tích AI (${config.provider}):`, err.message);
    const fallback = getHeuristicReview({
      studentName: submission.student_name,
      questions,
      textAnswers,
      attachments
    });
    fallback.notice = `(Gợi ý sư phạm nội bộ do: ${err.message})`;
    return fallback;
  }
}

/**
 * FEATURE 3: Socratic Hint cho học sinh
 */
async function getMathHint({ questionTitle, questionContent, studentAnswer = '', hintType = 'idea' }) {
  const config = getAiConfig();

  if (config.provider === PROVIDERS.OFFLINE || (!config.hasKey && config.provider !== PROVIDERS.OLLAMA)) {
    return getFallbackMathHint(questionTitle, questionContent, hintType);
  }

  let systemPrompt = '';
  let userPrompt = '';

  if (hintType === 'steps') {
    systemPrompt = `Bạn là người anh gia sư Toán THCS. Xưng hô là 'anh', gọi học sinh là 'em'.
Học sinh yêu cầu: GỢI Ý CÁCH LÀM (Sơ đồ các bước thực hiện).
NHIỆM VỤ CỦA ANH:
1. Vạch ra KHUNG SƯỜN CÁC BƯỚC THỰC HIỆN THEO THỨ TỰ (Bước 1: ..., Bước 2: ..., Bước 3: ..., Bước 4: ...).
2. Ở mỗi bước, nêu rõ mục tiêu cần làm, phương pháp biến đổi và công thức liên quan.
3. Cảnh báo những cạm bẫy hoặc lỗi sai dễ nhầm lẫn (như thiếu ĐKXĐ, nhầm dấu khi trừ phân thức).
QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ - KHÔNG ĐƯỢC LÀM TRỰC TIẾP LUÔN):
- TUYỆT ĐỐI KHÔNG TÍNH TOÁN HỘ, KHÔNG LÀM TRỰC TIẾP RA SỐ HAY BIỂU THỨC KẾT QUẢ RÚT GỌN HOẶC NGHIỆM!
- Bắt buộc để học sinh tự đặt bút tính toán từng bước để hiểu sâu bản chất. Dặn em: "Anh chỉ vạch ra sườn các bước thôi, em hãy tự đặt bút tính từng bước nhé!".
- Mọi công thức bọc trong $...$ hoặc $$...$$, tuyệt đối không dùng \\[ \\] hay mã code thô.
- Giọng điệu nhiệt tình, rõ ràng, sư phạm và gần gũi.`;

    userPrompt = `
Học sinh đang cần gợi ý CÁCH LÀM (sơ đồ các bước) cho câu hỏi:
Tiêu đề: ${questionTitle || 'Câu hỏi'}
Đề bài: ${questionContent.replace(/<[^>]*>/g, ' ')}
Ghi chú/bước làm hiện tại của học sinh: ${studentAnswer || '(Chưa có)'}

Hãy lập ra sơ đồ 3-4 bước thực hiện mạch lạc (Bước 1, Bước 2, Bước 3...), kèm các bẫy cần tránh. Nhắc học sinh tự tính toán, anh tuyệt đối không làm hộ trực tiếp.
`;
  } else {
    // hintType === 'idea'
    systemPrompt = `Bạn là người anh gia sư Toán THCS. Xưng hô là 'anh', gọi học sinh là 'em'.
Học sinh yêu cầu: GỢI Ý Ý TƯỞNG (Tư duy & Hướng tiếp cận).
NHIỆM VỤ CỦA ANH:
1. Nhận diện dạng toán và chỉ ra Ý TƯỞNG CỐT LÕI (bản chất mấu chốt để nhìn ra bài toán).
2. Gợi mở trực giác toán học, liên hệ tới các định nghĩa, định lý hay hằng đẳng thức quan trọng.
3. Đặt 1-2 câu hỏi khơi gợi suy nghĩ để học sinh tự nảy ra hướng đi.
QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):
- TUYỆT ĐỐI KHÔNG NÊU CÁC BƯỚC GIẢI CHI TIẾT (để dành cho chế độ Cách làm).
- TUYỆT ĐỐI KHÔNG GIẢI HỘ, KHÔNG TÍNH TOÁN RA SỐ, KHÔNG CHO ĐÁP SỐ.
- Mọi công thức bọc trong $...$ hoặc $$...$$, tuyệt đối không dùng \\[ \\] hay mã code thô.
- Giọng điệu thân thiện, mộc mạc của người anh kèm em học.`;

    userPrompt = `
Học sinh đang cần gợi ý Ý TƯỞNG tiếp cận cho câu hỏi:
Tiêu đề: ${questionTitle || 'Câu hỏi'}
Đề bài: ${questionContent.replace(/<[^>]*>/g, ' ')}
Ghi chú/bước làm hiện tại của học sinh: ${studentAnswer || '(Chưa có)'}

Hãy phân tích ngắn gọn ý tưởng then chốt và đặt 1-2 câu hỏi gợi mở trực giác để học sinh tự nhận ra hướng giải.
`;
  }

  try {
    const hintText = await dispatchAiCall({
      systemPrompt,
      userPrompt
    });

    return {
      success: true,
      source: config.provider,
      hintType,
      hint: hintText.trim()
    };
  } catch (err) {
    return getFallbackMathHint(questionTitle, questionContent, hintType);
  }
}

/**
 * FEATURE 3.5: Gia sư AI Socratic tương tác trực tiếp cho học sinh (Hỏi đáp tư duy)
 * Học sinh gửi câu hỏi hoặc bước làm -> AI đóng vai trò Gia sư gợi mở từng bước.
 * TUYỆT ĐỐI KHÔNG giải hộ bài toán, KHÔNG đưa ra đáp số cuối cùng.
 */
async function chatWithAiTutor({
  questionTitle = '',
  questionContent = '',
  studentMessage = '',
  chatHistory = [],
  studentAnswer = ''
}) {
  const config = getAiConfig();

  if (config.provider === PROVIDERS.OFFLINE || (!config.hasKey && config.provider !== PROVIDERS.OLLAMA)) {
    return getFallbackTutorResponse({
      questionTitle,
      questionContent,
      studentMessage,
      studentAnswer
    });
  }

  const defaultAnhEmPersona = 'Xưng hô: BẮT BUỘC xưng là "anh", gọi học sinh là "em". Phong cách: Thân thiện, gần gũi, thoải mái như người anh kèm em học bài, nhiệt tình, dễ hiểu, hay động viên. Tuyệt đối không xưng "Thầy/Cô", chỉ xưng là "anh". Khi học sinh đòi đáp án thì bảo: "Anh không giải hộ đâu nhé, để anh gợi ý từng bước rồi em tự làm mới hiểu sâu được!".';

  const customPersonaNote = `\n🎭 YÊU CẦU ĐẶC BIỆT VỀ TÍNH CÁCH, XƯNG HÔ & PHONG CÁCH NÓI CHUYỆN:\n${config.tutorPersona || defaultAnhEmPersona}\n(BẮT BUỘC tuân thủ nghiêm ngặt xưng hô là "anh" - "em", câu cửa miệng và giọng điệu này trong mọi câu trả lời, đồng thời giữ vững nguyên tắc Socratic không giải hộ bài toán!)\n`;

  const systemPrompt = `Bạn là ANH GIA SƯ TOÁN THCS (Lớp 6 đến Lớp 9) đồng hành cùng học sinh Việt Nam theo PHƯƠNG PHÁP SOCRATIC (Gợi mở tư duy).
${customPersonaNote}
QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT - KHÔNG BAO GIỜ VI PHẠM):
1. TUYỆT ĐỐI KHÔNG GIẢI HỘ BÀI TOÁN! TUYỆT ĐỐI KHÔNG ĐƯA RA ĐÁP SỐ CUỐI CÙNG (không tính ra kết quả số học, không đưa ra nghiệm x = ..., không ghi đáp số kết luận).
2. TUYỆT ĐỐI KHÔNG VIẾT TOÀN BỘ LỜI GIẢI HOÀN CHỈNH TỪ ĐẦU ĐẾN CUỐI CHO HỌC SINH CHÉP.
3. KHI HỌC SINH YÊU CẦU: "cho em đáp án", "giải hộ em", "kết quả bằng mấy", "làm hết cho em", "chỉ em cách bấm máy tính ra đáp số":
   -> Hãy từ chối một cách khéo léo, gần gũi (ví dụ: "Anh không giải hộ đâu nhé, để anh hướng dẫn từng bước rồi em tự làm mới hiểu sâu được!").
   -> Sau đó gợi ý bước đầu tiên hoặc đặt một câu hỏi gợi mở để học sinh tự làm.
4. VAI TRÒ CỦA BẠN LÀ NGƯỜI ANH GIA SƯ HƯỚNG DẪN TƯ DUY:
   - Xưng là "anh", gọi học sinh là "em". Thân thiện, hòa đồng, thoải mái, dễ hiểu.
   - Giúp học sinh hiểu đề bài và nhận diện dạng toán (Rút gọn biểu thức, Lập hệ phương trình, Định lý Vi-ét, Hình học đường tròn, Bất đẳng thức,...).
   - Nhắc lại các định nghĩa, định lý, hệ thức, công thức toán học cần áp dụng.
   - QUY TẮC CÔNG THỨC TOÁN HỌC (BẮT BUỘC):
     + Mọi công thức toán PHẢI bọc trong cặp dấu $...$ (inline) hoặc $$...$$ (nếu cần đứng riêng một dòng). Ví dụ: $(a+b)^2 = a^2 + 2ab + b^2$, $\\Delta = b^2 - 4ac$, $\\sqrt{A^2} = |A|$, $\\frac{A}{B}$.
     + TUYỆT ĐỐI KHÔNG dùng cú pháp "\\[" hay "\\]", TUYỆT ĐỐI KHÔNG dùng "\\(" hay "\\)".
     + TUYỆT ĐỐI KHÔNG dùng các mã căn lề lạ như "\\;", "\\quad", "\\,". Dấu chia viết là ":" (ví dụ: $\\frac{A}{B} : \\frac{C}{D} = \\frac{A}{B} \\cdot \\frac{D}{C}$).
     + Không dùng các ký hiệu trừu tượng xa lạ như U, V, W, Z. Hãy diễn đạt tự nhiên bằng lời văn mộc mạc của người anh, kết hợp công thức chuẩn sách giáo khoa Toán THCS Việt Nam.
   - Khi học sinh hỏi "Em làm bước này đúng chưa: ...": Hãy phân tích logic bước làm của học sinh, khen ngợi điểm đúng, nhắc nhở lỗi sai về dấu, điều kiện xác định ($ĐKXĐ$), nhưng để học sinh tự tính toán và điều chỉnh.
   - KHI HỌC SINH HỎI "GỢI Ý Ý TƯỞNG":
     + Tập trung gợi mở bản chất đề bài, nhận diện dạng toán, ý tưởng cốt lõi và trực giác toán học. Đặt câu hỏi phản xạ để em tự nhận ra hướng giải.
     + TUYỆT ĐỐI không đi vào các bước chi tiết, không giải hộ.
   - KHI HỌC SINH HỎI "GỢI Ý CÁCH LÀM" (HOẶC "CÁC BƯỚC LÀM"):
     + Vạch ra khung sườn các bước thực hiện theo thứ tự (Bước 1: ..., Bước 2: ..., Bước 3: ...), nêu mục tiêu từng bước và các cạm bẫy dễ nhầm (như ĐKXĐ, đổi dấu).
     + TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM TRỰC TIẾP LUÔN! KHÔNG TÍNH TOÁN RA SỐ, KHÔNG VIẾT HỘ KẾT QUẢ BIỂU THỨC RÚT GỌN HAY NGHIỆM!
     + Dặn học sinh: "Anh chỉ vạch ra khung các bước thôi nhé, em hãy tự đặt bút tính toán từng bước thì mới nhớ lâu được!".
   - Đặt các câu hỏi gợi ý từng nấc nhỏ để dẫn dắt học sinh tự suy nghĩ và tìm ra lời giải.`;

  const cleanContent = (questionContent || '').replace(/<[^>]*>/g, ' ').trim();
  const contextHeader = `[NGỮ CẢNH CÂU HỎI MÀ HỌC SINH ĐANG LÀM]\nTiêu đề: ${questionTitle || 'Câu hỏi'}\nĐề bài: ${cleanContent}\n${studentAnswer ? `Ghi chú/bước làm hiện tại của học sinh: ${studentAnswer}\n` : ''}---\n`;

  const messages = [];

  // Mở đầu bối cảnh
  messages.push({
    role: 'user',
    content: `${contextHeader}Chào anh gia sư, em đang làm bài này và muốn nhờ anh hướng dẫn tư duy gợi mở.`
  });
  messages.push({
    role: 'assistant',
    content: `Chào em! Rất vui được đồng hành cùng em với bài toán này. Em đã đọc kỹ đề chưa? Em muốn anh nhắc lại công thức, định lý hay gợi ý bước bắt đầu nào trước nhé?`
  });

  // Đưa lịch sử chat vào
  if (Array.isArray(chatHistory)) {
    for (const msg of chatHistory) {
      if (msg && msg.text) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      }
    }
  }

  // Tin nhắn mới nhất của học sinh
  messages.push({
    role: 'user',
    content: studentMessage
  });

  try {
    const reply = await dispatchAiCall({
      systemPrompt,
      messages
    });

    return {
      success: true,
      source: config.provider,
      reply: reply.trim()
    };
  } catch (err) {
    console.error('Lỗi gọi AI Tutor Chat:', err);
    return getFallbackTutorResponse({
      questionTitle,
      questionContent,
      studentMessage,
      studentAnswer,
      errorMsg: err.message
    });
  }
}

/**
 * Phản hồi Socratic mẫu khi Offline hoặc lỗi mạng
 */
function getFallbackTutorResponse({ questionTitle, questionContent, studentMessage = '', studentAnswer = '', errorMsg = '' }) {
  const lower = studentMessage.toLowerCase();

  let reply = '';

  if (lower.includes('đáp án') || lower.includes('giải hộ') || lower.includes('kết quả') || lower.includes('làm hộ') || lower.includes('bằng bao nhiêu') || lower.includes('làm hết')) {
    reply = `Chào em! Anh không giải hộ bài toán hoặc đưa ra đáp số cuối cùng cho em được đâu nhé. 

Mục tiêu là giúp em hiểu sâu bản chất và tự tin làm bài thi đạt kết quả tốt nhất. Em hãy thử cho anh biết:
1. Em đã nhận diện đây là dạng toán nào chưa? (Rút gọn biểu thức, Lập hệ phương trình, Định lý Vi-ét hay Hình học?)
2. Em đã tìm **Điều kiện xác định ($ĐKXĐ$)** của bài toán chưa?

Em cứ thử thực hiện bước đầu tiên rồi nhắn lại cho anh xem nhé! Anh em mình cùng giải quyết từng bước. 💪`;
  } else if (lower.includes('công thức') || lower.includes('định lý') || lower.includes('hệ thức')) {
    reply = `Chào em! Dưới đây là các công thức trọng tâm em cần nhớ khi làm bài toán dạng này:

- **Hằng đẳng thức đáng nhớ:** $(a \\pm b)^2 = a^2 \\pm 2ab + b^2$, $a^2 - b^2 = (a-b)(a+b)$.
- **Căn bậc hai:** $\\sqrt{A^2} = |A|$; $\\sqrt{A \\cdot B} = \\sqrt{A} \\cdot \\sqrt{B}$ ($A, B \\ge 0$).
- **Định lý Vi-ét:** Cho phương trình $ax^2 + bx + c = 0$ ($a \\neq 0$), có 2 nghiệm $x_1, x_2$ thì:
  $$x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 x_2 = \\frac{c}{a}$$
- **Hệ thức lượng trong tam giác vuông:** $b^2 = a \\cdot b'$, $h^2 = b' \\cdot c'$, $b \\cdot c = a \\cdot h$.

Em xem công thức nào đang áp dụng phù hợp nhất cho bài toán của mình nhé!`;
  } else if (lower.includes('bước đầu') || lower.includes('hướng dẫn') || lower.includes('gợi ý') || lower.includes('bắt đầu') || lower.includes('làm sao')) {
    reply = `Chào em! Để bắt đầu giải bài toán này, anh gợi ý em làm theo các nấc tư duy sau:

1. **Bước 1: Tìm Điều kiện xác định ($ĐKXĐ$)**
   - Mẫu số phải khác $0$.
   - Biểu thức dưới dấu căn bậc hai phải $\\ge 0$.
2. **Bước 2: Quan sát và tìm hướng biến đổi**
   - Nếu là biểu thức phân thức: Phân tích mẫu thức thành nhân tử để tìm mẫu thức chung quy đồng.
   - Nếu là giải bài toán bằng cách lập PT: Đặt ẩn số kèm đơn vị và điều kiện thích hợp.
3. ❓ **Câu hỏi cho em:** Em thử nhìn vào biểu thức hoặc dữ kiện đầu tiên, em thấy có thành phần nào quen thuộc có thể rút gọn ngay không?`;
  } else {
    reply = `Anh đã nhận câu hỏi của em! 

Em chú ý nhé:
- Với bài toán này, mấu chốt là cần kiểm tra kỹ **điều kiện xác định** trước khi biến đổi.
- Nếu em đã làm được một vài bước biến đổi, hãy gõ bước làm của em vào đây (ví dụ: *"Em quy đồng ra mẫu chung là ... có đúng không anh?"*) để anh kiểm tra logic giúp em nhé!
- Cứ tự tin nháp từng bước ra giấy, anh tin em sẽ tự mình tìm ra đáp số! ✨`;
  }

  return {
    success: true,
    source: 'preset',
    reply: reply
  };
}

/**
 * FEATURE 4: Giải thích chi tiết sau thi
 */
async function explainQuestionSolution({ questionTitle, questionContent }) {
  const config = getAiConfig();

  if (config.provider === PROVIDERS.OFFLINE || (!config.hasKey && config.provider !== PROVIDERS.OLLAMA)) {
    return getFallbackSolutionExplanation(questionTitle, questionContent);
  }

  const systemPrompt = `Bạn là giáo viên Toán THCS. Hướng dẫn giải chi tiết bài toán với công thức chuẩn KaTeX ($...).`;

  const userPrompt = `
Tiêu đề: ${questionTitle || 'Bài toán'}
Đề bài: ${questionContent.replace(/<[^>]*>/g, ' ')}

Yêu cầu trình bày:
1. 💡 Phương pháp & Kiến thức áp dụng
2. 📝 Hướng dẫn giải chi tiết từng bước
3. ⚠️ Những lỗi sai học sinh hay mắc phải
4. 🎯 Mẹo làm bài nhanh & chính xác
`;

  try {
    const explanation = await dispatchAiCall({
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
    });

    return {
      success: true,
      source: config.provider,
      explanation: explanation.trim()
    };
  } catch (err) {
    return getFallbackSolutionExplanation(questionTitle, questionContent);
  }
}

// ==========================================
// NGÂN HÀNG ĐỀ TOÁN THCS & HEURISTIC ENGINE
// ==========================================

function getCuratedFallbackQuestions(grade, topic, count) {
  const gradeNum = parseInt(grade, 10) || 9;

  const repo = {
    9: [
      {
        title: "Câu 1: Rút gọn biểu thức chứa căn bậc hai",
        content: "Cho biểu thức $P = \\left( \\frac{\\sqrt{x}}{\\sqrt{x}-1} - \\frac{1}{x-\\sqrt{x}} \\right) : \\frac{\\sqrt{x}+1}{x-1}$ với $x > 0, x \\neq 1$.<br>a) Rút gọn biểu thức $P$.<br>b) Tìm các giá trị của $x$ để $P = \\frac{1}{2}$.<br>c) Tìm giá trị nhỏ nhất của biểu thức $P$ khi $x > 1$."
      },
      {
        title: "Câu 2: Giải bài toán bằng cách lập hệ phương trình",
        content: "Hai vòi nước cùng chảy vào một bể không có nước thì sau $4$ giờ $48$ phút đầy bể. Nếu mở vòi thứ nhất chảy trong $3$ giờ rồi mở vòi thứ hai chảy tiếp trong $4$ giờ thì được $\\frac{3}{4}$ bể nước. Hỏi nếu mỗi vòi chảy một mình thì sau bao lâu đầy bể?"
      },
      {
        title: "Câu 3: Phương trình bậc hai và hệ thức Vi-ét",
        content: "Cho phương trình $x^2 - 2(m-1)x + m^2 - 3m = 0$ ($m$ là tham số).<br>a) Giải phương trình khi $m = 2$.<br>b) Tìm tất cả các giá trị của $m$ để phương trình có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn: $x_1^2 + x_2^2 - x_1 x_2 = 13$."
      },
      {
        title: "Câu 4: Hình học đường tròn và tiếp tuyến",
        content: "Cho đường tròn $(O; R)$ và điểm $A$ nằm bên ngoài đường tròn. Kẻ hai tiếp tuyến $AB, AC$ với đường tròn ($B, C$ là các tiếp điểm). Gọi $H$ là giao điểm của $AO$ và $BC$.<br>a) Chứng minh tứ giác $ABOC$ nội tiếp một đường tròn.<br>b) Chứng minh $AO \\perp BC$ tại $H$ và tính tích $AH \\cdot AO$ theo $R$.<br>c) Kẻ đường kính $BD$, đoạn thẳng $AD$ cắt đường tròn tại $E$ ($E \\neq D$). Chứng minh $\\widehat{AHE} = \\widehat{ADO}$."
      },
      {
        title: "Câu 5: Bất đẳng thức & Giá trị lớn nhất nhỏ nhất",
        content: "Cho ba số thực dương $a, b, c$ thỏa mãn $a + b + c = 3$.<br>Chứng minh rằng: $\\frac{a}{1+b^2} + \\frac{b}{1+c^2} + \\frac{c}{1+a^2} \\ge \\frac{3}{2}$."
      }
    ],
    8: [
      {
        title: "Câu 1: Rút gọn phân thức đại số",
        content: "Cho biểu thức $A = \\left( \\frac{x}{x^2-4} + \\frac{2}{2-x} + \\frac{1}{x+2} \\right) : \\left( (x-2) + \\frac{10-x^2}{x+2} \\right)$.<br>a) Tìm điều kiện xác định và rút gọn $A$.<br>b) Tính giá trị của $A$ khi $|x| = \\frac{1}{2}$."
      },
      {
        title: "Câu 2: Giải bài toán bằng cách lập phương trình",
        content: "Một ô tô dự định đi từ $A$ đến $B$ với vận tốc $45$ km/h. Nhưng khi đi được một nửa quãng đường, xe phải dừng lại nghỉ $10$ phút. Để đến $B$ đúng giờ dự định, ô tô phải tăng vận tốc thêm $5$ km/h trên quãng đường còn lại. Tính độ dài quãng đường $AB$."
      },
      {
        title: "Câu 3: Tam giác đồng dạng và định lý Ta-lét",
        content: "Cho hình chữ nhật $ABCD$ có $AB = 8$ cm, $BC = 6$ cm. Kẻ $AH \\perp BD$ ($H \\in BD$).<br>a) Chứng minh $\\Delta AHB \\backsim \\Delta BCD$.<br>b) Tính độ dài đoạn thẳng $BD$ và $AH$.<br>c) Tia $AH$ cắt $CD$ tại $K$. Chứng minh $AH \\cdot AK = AD^2$."
      },
      {
        title: "Câu 4: Phân tích đa thức thành nhân tử & Tìm giá trị nhỏ nhất",
        content: "a) Phân tích đa thức thành nhân tử: $x^4 + 4x^2 - 5$.<br>b) Tìm giá trị nhỏ nhất của biểu thức: $M = x^2 - 4x + y^2 - 6y + 15$."
      }
    ],
    7: [
      {
        title: "Câu 1: Thực hiện phép tính số hữu tỉ",
        content: "Tính giá trị hợp lý:<br>a) $A = \\left(-\\frac{3}{4} + \\frac{2}{5}\\right) : \\frac{3}{7} + \\left(\\frac{3}{5} - \\frac{1}{4}\\right) : \\frac{3}{7}$<br>b) $B = 25 \\cdot \\left(-\\frac{1}{3}\\right)^3 + \\frac{1}{5} - 2 \\cdot \\left(-\\frac{1}{2}\\right)^2 - \\frac{1}{2}$"
      },
      {
        title: "Câu 2: Dãy tỉ số bằng nhau",
        content: "Tìm ba số $x, y, z$ biết: $\\frac{x}{3} = \\frac{y}{4} = \\frac{z}{5}$ và $2x + 3y - z = 39$."
      },
      {
        title: "Câu 3: Tam giác bằng nhau và đường trung trực",
        content: "Cho tam giác $ABC$ cân tại $A$. Kẻ $AH \\perp BC$ ($H \\in BC$).<br>a) Chứng minh $\\Delta ABH = \\Delta ACH$ và suy ra $H$ là trung điểm của $BC$.<br>b) Kẻ $HM \\perp AB$ ($M \\in AB$) và $HN \\perp AC$ ($N \\in AC$). Chứng minh $AM = AN$ và $\\Delta HMN$ là tam giác cân."
      }
    ],
    6: [
      {
        title: "Câu 1: Thực hiện phép tính số tự nhiên và lũy thừa",
        content: "Tính hợp lý nếu có thể:<br>a) $142 \\cdot 28 + 142 \\cdot 72 - 4200$<br>b) $3^3 \\cdot 18 - 3^3 \\cdot 12$<br>c) $120 : \\{54 - [50 : 2 - (3^2 - 2 \\cdot 4)]\\}$"
      },
      {
        title: "Câu 2: Tìm x và Tính chia hết",
        content: "Tìm số tự nhiên $x$, biết:<br>a) $3(x - 5) + 14 = 44$<br>b) $2^{x+1} - 2^x = 32$<br>c) Tìm ước chung lớn nhất và bội chung nhỏ nhất của hai số $72$ và $108$."
      },
      {
        title: "Câu 3: Bài toán Hình học trực quan",
        content: "Một mảnh vườn hình chữ nhật có chiều dài $25$ m, chiều rộng $12$ m. Ở giữa vườn người ta đào một cái ao hình vuông có cạnh $4$ m, phần đất còn lại dùng để trồng rau.<br>a) Tính diện tích mảnh vườn hình chữ nhật.<br>b) Tính diện tích phần đất trồng rau.<br>c) Nếu chi phí trồng rau là $15.000$ đồng/$m^2$ thì cần bao nhiêu tiền để hoàn thành việc trồng rau?"
      }
    ]
  };

  const pool = repo[gradeNum] || repo[9];
  const selected = pool.slice(0, count);

  return {
    success: true,
    source: 'preset',
    questions: selected.map((q, idx) => ({
      id: idx + 1,
      title: q.title,
      content: q.content
    }))
  };
}

function getHeuristicReview({ studentName, questions, textAnswers, attachments }) {
  const attCount = attachments.length;
  const hasText = Object.values(textAnswers).some(t => t && t.trim().length > 10);

  let feedback = `Thầy/Cô gửi lời nhận xét tới em ${studentName}:\n\n`;

  feedback += `🌟 1. Nhận xét tổng quan:\n`;
  if (attCount > 0) {
    feedback += `- Em đã hoàn thành bài thi và tải lên đầy đủ ${attCount} ảnh bài giải viết tay. Chữ viết và bài làm thể hiện tinh thần học tập nghiêm túc, có chuẩn bị chu đáo.\n\n`;
  } else if (hasText) {
    feedback += `- Em đã hoàn thành các câu hỏi dưới dạng văn bản trực tiếp trên hệ thống. Khuyến khích em ở các bài tiếp theo chụp thêm ảnh bài giải ra giấy để trình bày công thức và hình vẽ chi tiết hơn.\n\n`;
  } else {
    feedback += `- Bài làm còn khá sơ sài, em cần chú ý nộp đầy đủ các ảnh chụp bài giải tự luận để Thầy/Cô có thể theo dõi từng bước biến đổi.\n\n`;
  }

  feedback += `✅ 2. Ưu điểm nổi bật:\n`;
  feedback += `- Nắm được kiến thức trọng tâm của đề bài, các bước biến đổi ban đầu đúng hướng.\n`;
  feedback += `- Trình bày logic, thứ tự các câu rõ ràng, dễ theo dõi.\n\n`;

  feedback += `⚠️ 3. Những lỗi cần lưu ý & khắc phục:\n`;
  feedback += `- Cần cẩn thận điều kiện xác định (ĐKXĐ) ngay từ đầu bài toán và nhớ đối chiếu điều kiện ở bước kết luận nghiệm.\n`;
  feedback += `- Đối với bài hình học: Hãy chú ý ghi rõ lý do khi chứng minh hai tam giác bằng nhau/đồng dạng và đánh dấu ký hiệu góc vuông, cạnh bằng nhau vào hình vẽ.\n`;
  feedback += `- Tránh làm tắt ở các bước chuyển vế đổi dấu để không bị mất điểm trình bày đáng tiếc.\n\n`;

  feedback += `💡 4. Lời khuyên & Động viên:\n`;
  feedback += `- Em đang làm rất tốt, tiếp tục phát huy tinh thần tự giác này nhé! Hãy dành thêm 5 phút cuối mỗi bài kiểm tra để dò lại kết quả tính toán từng câu trước khi nộp. Chúc em ngày càng tiến bộ và yêu thích môn Toán hơn!`;

  return {
    success: true,
    source: 'preset',
    feedback,
    attachmentCount: attCount
  };
}

function getFallbackMathHint(title, content, hintType = 'idea') {
  let hint = '';

  if (hintType === 'steps') {
    hint = `📋 **Sơ đồ các bước làm bài (Em tự tính toán nhé, anh không làm trực tiếp hộ đâu!):**\n\n`;
    hint += `1. **Bước 1 (ĐKXĐ):** Tìm điều kiện xác định ($mẫu \\neq 0$, biểu thức dưới dấu căn $\\ge 0$).\n`;
    hint += `2. **Bước 2 (Phân tích mẫu & Mẫu chung):** Phân tích các mẫu số thành nhân tử (dùng hằng đẳng thức hoặc đặt nhân tử chung) để tìm mẫu thức chung.\n`;
    hint += `3. **Bước 3 (Quy đồng & Biến đổi):** Quy đồng mẫu, cộng trừ các phân thức và rút gọn tử số.\n`;
    hint += `4. **Bước 4 (Phép toán còn lại & Đối chiếu):** Thực hiện phép chia (nhân nghịch đảo), triệt tiêu các thừa số chung và đối chiếu lại với ĐKXĐ ban đầu.\n\n`;
    hint += `⚠️ **Bẫy cần tránh:** Chú ý đổi dấu toàn bộ các hạng tử khi đằng trước phân thức có dấu trừ ($-$).`;
  } else {
    hint = `💡 **Gợi ý ý tưởng tiếp cận bài toán:**\n\n`;
    hint += `1. **Nhận diện dạng toán:** Quan sát các phân thức và căn thức trong đề bài để xác định trọng tâm (Rút gọn biểu thức, Lập hệ phương trình, Định lý Vi-ét hay Hình học).\n`;
    hint += `2. **Ý tưởng mấu chốt:** Hãy chú ý đến sự liên kết giữa các mẫu số — thường có dạng $A^2 - B^2 = (A-B)(A+B)$ hoặc $x - \\sqrt{x} = \\sqrt{x}(\\sqrt{x}-1)$. Đó chính là chìa khóa để tìm ra mẫu thức chung!\n`;
    hint += `3. ❓ **Câu hỏi gợi mở tư duy:** Em có thấy thành phần nào ở tử và mẫu có thể nhóm lại để rút gọn bớt trước khi quy đồng không? Hãy thử quan sát kỹ nhé!`;
  }

  return {
    success: true,
    source: 'preset',
    hintType,
    hint
  };
}

function getFallbackSolutionExplanation(title, content) {
  let exp = `📚 **Hướng dẫn phương pháp giải chuẩn mực:**\n\n`;
  exp += `1. **Kiến thức trọng tâm:**\n`;
  exp += `   - Quy tắc nhân chia lũy thừa, căn bậc hai: $\\sqrt{A^2} = |A|$, $\\sqrt{A \\cdot B} = \\sqrt{A} \\cdot \\sqrt{B}$ ($A, B \\ge 0$).\n`;
  exp += `   - Định lý Pytago trong tam giác vuông: $a^2 + b^2 = c^2$.\n`;
  exp += `   - Tính chất hai tiếp tuyến cắt nhau và góc nội tiếp cùng chắn một cung.\n\n`;
  exp += `2. **Các bước tiến hành giải:**\n`;
  exp += `   - **Bước 1:** Đặt điều kiện có nghĩa cho bài toán.\n`;
  exp += `   - **Bước 2:** Quy đồng mẫu số chung hoặc biến đổi đại số tương đương.\n`;
  exp += `   - **Bước 3:** Rút gọn các nhân tử chung và đối chiếu lại điều kiện để đưa ra kết luận nghiệm chính xác.\n\n`;
  exp += `⚠️ **Lỗi sai thường gặp:** Quên không đặt điều kiện xác định, quên đổi dấu khi phá ngoặc có dấu trừ đằng trước.`;

  return {
    success: true,
    source: 'preset',
    explanation: exp
  };
}

/**
 * Phân tích và chẩn đoán lỗ hổng kiến thức của học sinh dựa trên lịch sử tương tác AI
 * Tiêu chí sư phạm:
 * - Nếu chỉ hỏi gợi ý (1-2 lần) => An toàn (Low), tư duy độc lập tốt, không quá lo.
 * - Hỏi từ 3 lần trở lên hoặc chat trao đổi nhiều bước => Cần theo dõi (Medium).
 * - Hỏi dồn dập hoặc hỏi trực tiếp vào kiến thức nền tảng sơ cấp (quy tắc chuyển vế, đổi dấu, quy đồng, hằng đẳng thức...)
 *   => Báo động đỏ (High), kích hoạt AI phân tích sâu nguyên nhân gốc rễ và đề xuất giải pháp cho giáo viên.
 */
async function analyzeStudentKnowledgeGaps({ assignmentId = null, studentId = null, forceRefresh = false } = {}) {
  let pairsQuery = [
    'SELECT DISTINCT ai.user_id, ai.assignment_id,',
    '       u.full_name, u.username, c.name AS class_name,',
    '       a.title AS assignment_title, a.content AS assignment_content',
    'FROM ai_interactions ai',
    'JOIN users u ON ai.user_id = u.id',
    'LEFT JOIN class_members cm ON cm.student_id = u.id',
    'LEFT JOIN classes c ON c.id = cm.class_id',
    'LEFT JOIN assignments a ON ai.assignment_id = a.id',
    'WHERE 1=1'
  ].join('\n');

  const params = [];
  if (assignmentId) {
    pairsQuery += ' AND ai.assignment_id = ?';
    params.push(assignmentId);
  }
  if (studentId) {
    pairsQuery += ' AND ai.user_id = ?';
    params.push(studentId);
  }
  pairsQuery += ' ORDER BY ai.user_id ASC, ai.assignment_id ASC';

  const pairs = db.prepare(pairsQuery).all(...params);
  const results = [];
  const config = getAiConfig();

  for (const pair of pairs) {
    const sId = pair.user_id;
    const aId = pair.assignment_id;

    // Lấy toàn bộ tương tác của học sinh này trong bài tập này
    const interactions = db.prepare([
      'SELECT * FROM ai_interactions',
      'WHERE user_id = ? AND assignment_id = ?',
      'ORDER BY created_at ASC'
    ].join('\n')).all(sId, aId);

    if (interactions.length === 0) continue;

    const hintIdeaCount = interactions.filter(i => i.interaction_type === 'hint_idea').length;
    const hintStepCount = interactions.filter(i => i.interaction_type === 'hint_steps').length;
    const hintCount = hintIdeaCount + hintStepCount;
    const chatCount = interactions.filter(i => i.interaction_type === 'tutor_chat').length;
    const totalCount = interactions.length;
    const lastPromptText = interactions[interactions.length - 1].prompt_text;

    // Kiểm tra cache nếu không yêu cầu làm mới
    if (!forceRefresh) {
      const cached = db.prepare([
        'SELECT * FROM ai_diagnostics',
        'WHERE student_id = ? AND assignment_id = ?'
      ].join('\n')).get(sId, aId);

      if (cached && cached.interaction_count === totalCount) {
        let actionPlanParsed = [];
        try {
          actionPlanParsed = JSON.parse(cached.action_plan);
        } catch (e) {
          actionPlanParsed = [cached.action_plan];
        }

        results.push({
          id: cached.id,
          studentId: sId,
          studentName: pair.full_name,
          studentUsername: pair.username,
          className: pair.class_name,
          assignmentId: aId,
          assignmentTitle: pair.assignment_title,
          severity: cached.severity,
          severityLabel: cached.severity_label,
          mainTopic: cached.main_topic,
          specificGap: cached.specific_gap,
          rootCause: cached.root_cause,
          pedagogicalImpact: cached.pedagogical_impact,
          actionPlan: actionPlanParsed,
          suggestedExercise: cached.suggested_exercise,
          interactionCount: cached.interaction_count,
          hintCount: cached.hint_count,
          chatCount: cached.chat_count,
          lastPromptText: cached.last_prompt_text,
          updatedAt: cached.updated_at
        });
        continue;
      }
    }

    // Đọc ngữ cảnh câu hỏi trong đề
    let questionContext = '';
    try {
      if (pair.assignment_content) {
        const qList = JSON.parse(pair.assignment_content);
        if (Array.isArray(qList)) {
          const qIdx = interactions[0].question_index || 1;
          const foundQ = qList.find(q => q.id === qIdx || q.index === qIdx) || qList[0];
          if (foundQ) {
            questionContext = `Câu ${foundQ.id || qIdx}: ${foundQ.title || ''} - ${foundQ.content || ''}`;
          }
        }
      }
    } catch (e) {}

    // Kiểm tra từ khóa hổng kiến thức nền tảng sơ cấp
    const combinedPrompts = interactions.map(i => i.prompt_text).join(' \n ');
    const foundationalKeywordsRegex = /(chuyển vế|đổi dấu|công thức nghiệm|quy đồng|rút gọn|đặt nhân tử|hằng đẳng thức|đkxđ|điều kiện xác định|bấm máy|không biết làm|quên|tại sao|nhân chia|phân số|căn bậc hai|làm thế nào|tính sao)/i;
    const hasFoundationalIssue = foundationalKeywordsRegex.test(combinedPrompts);

    let diagnosticData = null;

    // PHÂN LOẠI MỨC ĐỘ
    // Mức 1: An toàn (Low) - Chỉ hỏi gợi ý 1-2 lần, tư duy tốt, không quá lo
    if (chatCount === 0 && hintCount <= 2 && !hasFoundationalIssue) {
      diagnosticData = {
        severity: 'low',
        severityLabel: '🟢 An toàn (Chỉ xin gợi ý, tư duy tốt)',
        mainTopic: 'Phương pháp tiếp cận bài toán',
        specificGap: 'Chưa phát hiện lỗ hổng lớn. Học sinh chỉ cần gợi ý ý tưởng hoặc sơ đồ các bước ban đầu để định hướng suy nghĩ.',
        rootCause: 'Tư duy độc lập còn tốt. Học sinh chủ động xin gợi mở phương pháp tiếp cận thay vì đòi đáp án hay hỏi dồn dập.',
        pedagogicalImpact: 'Không có rủi ro đáng kể. Học sinh hoàn toàn có năng lực tự học và hoàn thiện bài làm.',
        actionPlan: [
          'Khuyến khích học sinh tiếp tục duy trì tinh thần tự lập khi làm bài kiểm tra.',
          'Khen ngợi tinh thần tự giác dùng gợi ý đúng cách thay vì chép lời giải.'
        ],
        suggestedExercise: 'Duy trì các bài tập theo tiến độ chuẩn trên lớp.'
      };
    } else {
      // Mức 2 hoặc Mức 3: Cần theo dõi hoặc Báo động đỏ
      const isHigh = chatCount >= 2 || totalCount >= 4 || hasFoundationalIssue;
      const targetSeverity = isHigh ? 'high' : 'medium';
      const targetLabel = isHigh ? '🔴 Báo động: Hổng kiến thức nền tảng (Cần can thiệp)' : '🟡 Cần lưu ý theo dõi';

      // Thử gọi AI để chẩn đoán chuyên sâu
      let aiSucceeded = false;
      if (config.hasKey && config.provider !== 'offline') {
        try {
          const logSummary = interactions.map((it, idx) => 
            `[Lượt ${idx + 1}] (${it.interaction_type === 'tutor_chat' ? 'Học sinh hỏi chat' : 'Xin gợi ý'}): "${it.prompt_text}" -> AI trả lời tóm tắt: "${it.response_text ? it.response_text.substring(0, 150) + '...' : ''}"`
          ).join('\n');

          const aiPrompt = `Bạn là Chuyên gia Sư phạm môn Toán THCS. Hãy phân tích lịch sử hỏi đáp của học sinh với Gia sư AI và chẩn đoán lỗ hổng kiến thức để báo cáo cho Giáo viên bộ môn.
LƯU Ý CỦA GIÁO VIÊN: "Nếu chỉ hỏi gợi ý thì chưa yếu quá nên cũng không quá lo, nhưng nếu hỏi rất nhiều hoặc hỏi vào các quy tắc sơ cấp nền tảng thì hãy phân tích kỹ rồi nói cho tôi".

HỌC SINH: ${pair.full_name} (${pair.class_name || 'Lớp chưa rõ'})
BÀI TẬP: ${pair.assignment_title}
NGỮ CẢNH CÂU HỎI TRONG ĐỀ: ${questionContext || 'Giải bài toán đại số / hình học'}
LỊCH SỬ HỎI ĐÁP:
${logSummary}

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc sau (không kèm markdown ngoài JSON):
{
  "severity": "${targetSeverity}",
  "severityLabel": "${targetLabel}",
  "mainTopic": "Tên chuyên đề Toán bị hổng (ví dụ: Đại số - Quy tắc biến đổi phương trình bậc nhất)",
  "specificGap": "Mô tả cụ thể lỗ hổng kiến thức (ví dụ: Quy tắc chuyển vế đổi dấu trong giải phương trình)",
  "rootCause": "Phân tích nguyên nhân cốt lõi (tại sao học sinh lại lúng túng ở phần này)",
  "pedagogicalImpact": "Tác động tiêu cực đối với các bài học và dạng toán tiếp theo nếu không khắc phục",
  "actionPlan": [
    "Hành động cụ thể 1 cho giáo viên (ví dụ: nhắc lại quy tắc nào, giải thích bản chất gì)",
    "Hành động cụ thể 2 cho giáo viên"
  ],
  "suggestedExercise": "Ví dụ bài tập ngắn gọn giáo viên nên giao để em củng cố ngay (kèm đề bài cụ thể)"
}`;

          let responseText = '';
          if (config.provider === 'gemini') {
            responseText = await callGeminiApi({
              apiKey: config.apiKey,
              model: config.model,
              prompt: aiPrompt
            });
          } else {
            responseText = await callOpenAiCompatibleApi({
              apiKey: config.apiKey,
              baseUrl: config.baseUrl,
              model: config.model,
              messages: [{ role: 'user', content: aiPrompt }],
              temperature: 0.2
            });
          }

          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            diagnosticData = {
              severity: parsed.severity || targetSeverity,
              severityLabel: parsed.severityLabel || targetLabel,
              mainTopic: parsed.mainTopic || 'Đại số THCS',
              specificGap: parsed.specificGap || 'Cần củng cố phương pháp biến đổi',
              rootCause: parsed.rootCause || 'Học sinh chưa thành thạo bước tính toán trung gian',
              pedagogicalImpact: parsed.pedagogicalImpact || 'Ảnh hưởng đến tốc độ và độ chính xác khi làm bài',
              actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [parsed.actionPlan || 'Nhắc lại lý thuyết trọng tâm'],
              suggestedExercise: parsed.suggestedExercise || 'Luyện tập thêm các bài toán cùng dạng'
            };
            aiSucceeded = true;
          }
        } catch (aiErr) {
          console.warn('[AI Diagnostics] Lỗi khi gọi AI API, sử dụng bộ quy tắc sư phạm dự phòng:', aiErr.message);
        }
      }

      // Bộ quy tắc chẩn đoán sư phạm dự phòng nếu không dùng AI API
      if (!aiSucceeded || !diagnosticData) {
        if (/chuyển vế|đổi dấu/i.test(combinedPrompts)) {
          diagnosticData = {
            severity: 'high',
            severityLabel: '🔴 Báo động: Hổng kiến thức nền tảng (Cần can thiệp)',
            mainTopic: 'Đại số - Giải phương trình bậc nhất một ẩn ($ax+b=c$)',
            specificGap: 'Quy tắc chuyển vế đổi dấu trong đẳng thức ($A + b = c \\Leftrightarrow A = c - b$)',
            rootCause: 'Học sinh bị hổng kiến thức nền tảng ở lớp 6 & lớp 8. Em chưa hiểu bản chất biến đổi tương đương hai vế (cộng/trừ cùng một số vào hai vế), dẫn đến lúng túng không biết khi chuyển số hạng từ vế này sang vế kia phải đổi dấu như thế nào.',
            pedagogicalImpact: 'Đây là quy tắc nền tảng xương sống của Đại số. Nếu không củng cố ngay, em sẽ làm sai hàng loạt các bài toán sau như giải phương trình bậc hai, hệ phương trình, bất phương trình và rút gọn phân thức đại số.',
            actionPlan: [
              'Nhắc lại khẩu quyết kinh điển: "Chuyển vế thì phải đổi dấu" (+ đổi thành -, - đổi thành +).',
              'Giải thích bản chất hai vế như một chiếc cân thăng bằng: Bớt 4 ở vế trái thì phải bớt 4 ở vế phải (2x + 4 - 4 = 10 - 4).',
              'Giao 3-5 câu phương trình cơ bản đầu giờ để em luyện phản xạ và tự tin hơn.'
            ],
            suggestedExercise: 'Giao luyện tập: 1) $x + 5 = 12$; 2) $2x - 6 = 10$; 3) $15 - 3x = 6$.'
          };
        } else if (/quy đồng|mẫu số/i.test(combinedPrompts)) {
          diagnosticData = {
            severity: 'high',
            severityLabel: '🔴 Báo động: Hổng kiến thức nền tảng (Cần can thiệp)',
            mainTopic: 'Phân thức đại số - Kỹ năng quy đồng mẫu thức',
            specificGap: 'Xác định mẫu thức chung và nhân tử phụ',
            rootCause: 'Học sinh chưa thành thạo phân tích đa thức thành nhân tử để tìm mẫu thức chung nhỏ nhất.',
            pedagogicalImpact: 'Dẫn đến việc không rút gọn được biểu thức chứa phân thức hoặc làm bài toán trở nên quá cồng kềnh.',
            actionPlan: [
              'Ôn lại 7 hằng đẳng thức đáng nhớ để phân tích mẫu số thành tích.',
              'Hướng dẫn tìm Mẫu thức chung theo 3 bước: Hệ số, Biến chung, Biến riêng.'
            ],
            suggestedExercise: 'Cho quy đồng: $\\frac{1}{x-1} - \\frac{2}{x^2-1}$.'
          };
        } else {
          diagnosticData = {
            severity: targetSeverity,
            severityLabel: targetLabel,
            mainTopic: 'Phương pháp giải toán & Biến đổi đại số',
            specificGap: 'Học sinh còn lúng túng trong các bước biến đổi trung gian và liên kết dữ kiện bài toán.',
            rootCause: 'Chưa tự tin vào các bước lập luận, cần người đồng hành khẳng định lại tính đúng đắn của từng bước giải.',
            pedagogicalImpact: 'Làm chậm tiến độ làm bài thi và dễ mất điểm ở phần trình bày tự luận.',
            actionPlan: [
              'Kiểm tra bài nộp chi tiết của học sinh để xác định cụ thể bước em bị vướng.',
              'Gợi ý học sinh tóm tắt đề bài ra nháp trước khi bắt tay vào giải.'
            ],
            suggestedExercise: 'Luyện tập thêm 2 bài tập tương tự ở mức độ thông hiểu.'
          };
        }
      }
    }

    // Lưu / Cập nhật vào bảng ai_diagnostics
    const actionPlanJson = JSON.stringify(diagnosticData.actionPlan);
    db.prepare([
      'INSERT INTO ai_diagnostics (',
      '  student_id, assignment_id, severity, severity_label, main_topic,',
      '  specific_gap, root_cause, pedagogical_impact, action_plan,',
      '  suggested_exercise, interaction_count, hint_count, chat_count,',
      '  last_prompt_text, updated_at',
      ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      'ON CONFLICT(student_id, assignment_id) DO UPDATE SET',
      '  severity = excluded.severity,',
      '  severity_label = excluded.severity_label,',
      '  main_topic = excluded.main_topic,',
      '  specific_gap = excluded.specific_gap,',
      '  root_cause = excluded.root_cause,',
      '  pedagogical_impact = excluded.pedagogical_impact,',
      '  action_plan = excluded.action_plan,',
      '  suggested_exercise = excluded.suggested_exercise,',
      '  interaction_count = excluded.interaction_count,',
      '  hint_count = excluded.hint_count,',
      '  chat_count = excluded.chat_count,',
      '  last_prompt_text = excluded.last_prompt_text,',
      '  updated_at = CURRENT_TIMESTAMP'
    ].join('\n')).run(
      sId, aId, diagnosticData.severity, diagnosticData.severityLabel,
      diagnosticData.mainTopic, diagnosticData.specificGap, diagnosticData.rootCause,
      diagnosticData.pedagogicalImpact, actionPlanJson, diagnosticData.suggestedExercise,
      totalCount, hintCount, chatCount, lastPromptText
    );

    results.push({
      studentId: sId,
      studentName: pair.full_name,
      studentUsername: pair.username,
      className: pair.class_name,
      assignmentId: aId,
      assignmentTitle: pair.assignment_title,
      severity: diagnosticData.severity,
      severityLabel: diagnosticData.severityLabel,
      mainTopic: diagnosticData.mainTopic,
      specificGap: diagnosticData.specificGap,
      rootCause: diagnosticData.rootCause,
      pedagogicalImpact: diagnosticData.pedagogicalImpact,
      actionPlan: diagnosticData.actionPlan,
      suggestedExercise: diagnosticData.suggestedExercise,
      interactionCount: totalCount,
      hintCount,
      chatCount,
      lastPromptText,
      updatedAt: new Date().toISOString()
    });
  }

  // Tổng hợp thống kê
  const summary = {
    totalStudents: results.length,
    lowCount: results.filter(r => r.severity === 'low').length,
    mediumCount: results.filter(r => r.severity === 'medium').length,
    highCount: results.filter(r => r.severity === 'high').length,
    topWeakTopics: [...new Set(results.filter(r => r.severity === 'high').map(r => r.mainTopic))]
  };

  return {
    success: true,
    summary,
    diagnostics: results
  };
}

module.exports = {
  PROVIDERS,
  DEFAULT_CONFIGS,
  getAiConfig,
  saveAiConfig,
  testAiConnection,
  generateMathQuestions,
  reviewSubmissionWithAi,
  getMathHint,
  chatWithAiTutor,
  explainQuestionSolution,
  analyzeStudentKnowledgeGaps
};

