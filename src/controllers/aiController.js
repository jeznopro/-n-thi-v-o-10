const db = require('../database/db');
const aiService = require('../services/aiService');
const { logAction } = require('../utils/logger');

/**
 * Lấy trạng thái cấu hình AI (dành cho Giáo viên)
 */
async function getSettings(req, res, next) {
  try {
    const config = aiService.getAiConfig();
    return res.json({
      success: true,
      config: {
        provider: config.provider,
        hasKey: config.hasKey,
        maskedKey: config.maskedKey,
        model: config.model,
        baseUrl: config.baseUrl,
        tutorPersona: config.tutorPersona,
        providersList: config.providersList
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cập nhật cấu hình AI (dành cho Giáo viên)
 */
async function updateSettings(req, res, next) {
  try {
    const { provider, apiKey, model, baseUrl, tutorPersona } = req.body;

    const updated = aiService.saveAiConfig({ provider, apiKey, model, baseUrl, tutorPersona });

    logAction({
      userId: req.user.id,
      action: 'UPDATE_AI_SETTINGS',
      targetType: 'system_settings',
      ip: req.ip,
      details: { provider: updated.provider, model: updated.model, hasKey: updated.hasKey }
    });

    return res.json({
      success: true,
      message: 'Cập nhật cấu hình AI thành công!',
      config: {
        provider: updated.provider,
        hasKey: updated.hasKey,
        maskedKey: updated.maskedKey,
        model: updated.model,
        baseUrl: updated.baseUrl,
        tutorPersona: updated.tutorPersona,
        providersList: updated.providersList
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Kiểm tra kết nối AI
 */
async function testConnection(req, res, next) {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;
    const testResult = await aiService.testAiConnection({ provider, apiKey, model, baseUrl });

    return res.json({
      success: testResult.success,
      provider: testResult.provider,
      model: testResult.model,
      reply: testResult.reply,
      error: testResult.error
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Soạn đề Toán THCS bằng AI
 */
async function generateQuestions(req, res, next) {
  try {
    const { grade, topic, difficulty, count, notes } = req.body;

    const result = await aiService.generateMathQuestions({
      grade,
      topic,
      difficulty,
      count,
      notes
    });

    logAction({
      userId: req.user.id,
      action: 'AI_GENERATE_QUESTIONS',
      targetType: 'assignments',
      ip: req.ip,
      details: { grade, topic, count, source: result.source }
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * AI Phân tích bài làm và gợi ý lời phê (Giáo viên)
 */
async function reviewSubmission(req, res, next) {
  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã bài nộp (submissionId).'
      });
    }

    const result = await aiService.reviewSubmissionWithAi(submissionId);

    logAction({
      userId: req.user.id,
      action: 'AI_REVIEW_SUBMISSION',
      targetType: 'submissions',
      targetId: submissionId,
      ip: req.ip,
      details: { source: result.source, attachmentCount: result.attachmentCount }
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Gợi ý phương hướng giải toán cho học sinh (Socratic Hint)
 */
async function getHint(req, res, next) {
  try {
    const { assignmentId, questionIndex = 1, questionTitle, questionContent, studentAnswer, hintType = 'idea' } = req.body;

    if (!questionContent) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung câu hỏi.'
      });
    }

    const result = await aiService.getMathHint({
      questionTitle,
      questionContent,
      studentAnswer,
      hintType: hintType === 'steps' ? 'steps' : 'idea'
    });

    // Lưu lại tương tác nếu là học sinh
    if (req.user && req.user.role === 'student') {
      try {
        let submissionId = null;
        if (assignmentId) {
          const sub = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY attempt_number DESC LIMIT 1').get(assignmentId, req.user.id);
          if (sub) submissionId = sub.id;
        }

        const type = hintType === 'steps' ? 'hint_steps' : 'hint_idea';
        const promptDesc = `Yêu cầu gợi ý [${hintType === 'steps' ? 'Cách làm / Các bước' : 'Ý tưởng tiếp cận'}]${studentAnswer ? ` (Bài làm hiện tại: "${studentAnswer.substring(0, 150)}")` : ''}`;

        db.prepare(`
          INSERT INTO ai_interactions (user_id, assignment_id, submission_id, interaction_type, question_index, question_title, prompt_text, response_text, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          assignmentId || null,
          submissionId,
          type,
          questionIndex || 1,
          questionTitle || null,
          promptDesc,
          result.hint || '',
          result.source || 'ai'
        );
      } catch (dbErr) {
        console.error('Lỗi lưu tương tác AI getHint:', dbErr);
      }
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Gia sư AI Socratic tương tác (Dành cho Học sinh trong phòng thi và khi xem bài)
 * Chỉ hỗ trợ hỏi đáp, gợi ý phương hướng, kiểm tra tư duy — Tuyệt đối KHÔNG giải hộ.
 */
async function tutorChat(req, res, next) {
  try {
    const { assignmentId, questionIndex = 1, questionTitle, questionContent, studentMessage, chatHistory, studentAnswer } = req.body;

    if (!studentMessage || !studentMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập câu hỏi hoặc thắc mắc gửi tới Gia sư AI.'
      });
    }

    const result = await aiService.chatWithAiTutor({
      questionTitle,
      questionContent,
      studentMessage: studentMessage.trim(),
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
      studentAnswer
    });

    logAction({
      userId: req.user.id,
      action: 'AI_TUTOR_CHAT',
      targetType: 'questions',
      ip: req.ip,
      details: { questionTitle, source: result.source }
    });

    // Lưu lại tương tác nếu là học sinh
    if (req.user && req.user.role === 'student') {
      try {
        let submissionId = null;
        if (assignmentId) {
          const sub = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY attempt_number DESC LIMIT 1').get(assignmentId, req.user.id);
          if (sub) submissionId = sub.id;
        }

        db.prepare(`
          INSERT INTO ai_interactions (user_id, assignment_id, submission_id, interaction_type, question_index, question_title, prompt_text, response_text, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          assignmentId || null,
          submissionId,
          'tutor_chat',
          questionIndex || 1,
          questionTitle || null,
          studentMessage.trim(),
          result.reply || '',
          result.source || 'ai'
        );
      } catch (dbErr) {
        console.error('Lỗi lưu tương tác AI tutorChat:', dbErr);
      }
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * AI Giải thích chi tiết sau khi xem kết quả
 */
async function explainSolution(req, res, next) {
  try {
    const { assignmentId, questionIndex = 1, questionTitle, questionContent } = req.body;

    if (!questionContent) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung câu hỏi.'
      });
    }

    const result = await aiService.explainQuestionSolution({
      questionTitle,
      questionContent
    });

    // Lưu lại tương tác nếu là học sinh
    if (req.user && req.user.role === 'student') {
      try {
        let submissionId = null;
        if (assignmentId) {
          const sub = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY attempt_number DESC LIMIT 1').get(assignmentId, req.user.id);
          if (sub) submissionId = sub.id;
        }

        db.prepare(`
          INSERT INTO ai_interactions (user_id, assignment_id, submission_id, interaction_type, question_index, question_title, prompt_text, response_text, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          assignmentId || null,
          submissionId,
          'explanation',
          questionIndex || 1,
          questionTitle || null,
          'Yêu cầu xem giải thích chi tiết & bài giải mẫu',
          result.explanation || '',
          result.source || 'ai'
        );
      } catch (dbErr) {
        console.error('Lỗi lưu tương tác AI explainSolution:', dbErr);
      }
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy danh sách học sinh hỏi AI (Dành cho Giáo viên)
 */
async function getInteractions(req, res, next) {
  try {
    const { assignmentId, studentId, type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT ai.*, u.full_name AS student_name, u.username AS student_username, a.title AS assignment_title
      FROM ai_interactions ai
      JOIN users u ON ai.user_id = u.id
      LEFT JOIN assignments a ON ai.assignment_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (assignmentId) {
      query += ` AND ai.assignment_id = ?`;
      params.push(assignmentId);
    }
    if (studentId) {
      query += ` AND ai.user_id = ?`;
      params.push(studentId);
    }
    if (type) {
      query += ` AND ai.interaction_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY ai.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const interactions = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) AS count FROM ai_interactions').get().count;

    return res.json({
      success: true,
      interactions,
      totalCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy lịch sử hỏi AI của chính mình theo bài tập (Học sinh)
 */
async function getMyInteractions(req, res, next) {
  try {
    const { assignmentId } = req.query;
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp assignmentId'
      });
    }

    const interactions = db.prepare(`
      SELECT * FROM ai_interactions
      WHERE user_id = ? AND assignment_id = ?
      ORDER BY created_at ASC
    `).all(req.user.id, assignmentId);

    return res.json({
      success: true,
      interactions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Tổng hợp & Chẩn đoán lỗ hổng kiến thức của học sinh (Giáo viên)
 */
async function getKnowledgeGapDiagnostics(req, res, next) {
  try {
    const { assignmentId, studentId, forceRefresh } = req.query;
    const result = await aiService.analyzeStudentKnowledgeGaps({
      assignmentId: assignmentId ? parseInt(assignmentId, 10) : null,
      studentId: studentId ? parseInt(studentId, 10) : null,
      forceRefresh: forceRefresh === 'true' || forceRefresh === true
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  testConnection,
  generateQuestions,
  reviewSubmission,
  getHint,
  tutorChat,
  explainSolution,
  getInteractions,
  getMyInteractions,
  getKnowledgeGapDiagnostics
};

