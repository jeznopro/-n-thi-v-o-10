-- Bật hỗ trợ khóa ngoại trong SQLite
PRAGMA foreign_keys = ON;

-- 1. Bảng người dùng (Giáo viên và Học sinh)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'locked')),
    must_change_password INTEGER NOT NULL DEFAULT 0, -- 1: bắt buộc đổi mật khẩu ở lần đăng nhập đầu
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lớp học
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng thành viên lớp học (Học sinh thuộc lớp nào)
CREATE TABLE IF NOT EXISTS class_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id)
);

-- 4. Bảng bài tập tự luận
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Nội dung đề bài dạng rich text HTML (đã qua lọc XSS)
    max_score REAL NOT NULL DEFAULT 10.0,
    time_limit_minutes INTEGER DEFAULT NULL, -- NULL: không giới hạn thời gian làm bài; > 0: số phút đếm ngược
    due_date DATETIME NOT NULL, -- Hạn chót nộp bài
    allow_resubmit INTEGER NOT NULL DEFAULT 0, -- 1: cho phép nộp lại nếu giáo viên yêu cầu
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng phân phối bài tập (Giao cho cả lớp hoặc từng học sinh)
CREATE TABLE IF NOT EXISTS assignment_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('class', 'student')),
    target_id INTEGER NOT NULL, -- class_id hoặc user_id của học sinh
    custom_content TEXT DEFAULT NULL, -- Đề bài riêng nếu giáo viên cá nhân hóa đề
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, target_type, target_id)
);

-- 6. Bảng tiêu chí chấm điểm (Rubric)
CREATE TABLE IF NOT EXISTS rubrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    criteria_name TEXT NOT NULL,
    description TEXT,
    max_score REAL NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 7. Bảng bài làm của học sinh (Submissions)
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT DEFAULT '', -- Nội dung bài làm rich text của học sinh
    word_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'graded', 'resubmission_requested')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Thời điểm học sinh mở bài làm (bắt đầu tính giờ nếu có giới hạn)
    submitted_at DATETIME DEFAULT NULL, -- Thời điểm nộp bài chính thức
    is_late INTEGER NOT NULL DEFAULT 0, -- 1: nộp sau hạn chót due_date
    attempt_number INTEGER NOT NULL DEFAULT 1, -- Lần nộp (1: lần đầu, 2: làm lại khi giáo viên yêu cầu)
    auto_saved_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Mốc thời gian tự động lưu nháp gần nhất
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id, attempt_number)
);

-- 8. Bảng kết quả chấm bài (Grades)
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_score REAL NOT NULL,
    feedback TEXT, -- Nhận xét chung của giáo viên
    rubric_breakdown TEXT, -- JSON lưu điểm chi tiết theo rubric: [{"rubric_id": 1, "criteria_name": "...", "score": 3.5, "note": "..."}]
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bảng tệp đính kèm (Attachments cho đề bài hoặc bài làm)
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('assignment', 'submission')),
    entity_id INTEGER NOT NULL, -- assignment_id hoặc submission_id
    question_index INTEGER DEFAULT 1, -- Số thứ tự câu hỏi (1, 2, 3...) mà ảnh này thuộc về
    file_name TEXT NOT NULL, -- Tên file gốc do người dùng tải lên
    file_path TEXT NOT NULL, -- Đường dẫn lưu trữ an toàn trên máy chủ
    file_size INTEGER NOT NULL, -- Dung lượng tính bằng Byte
    mime_type TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng nhật ký kiểm toán hệ thống (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- Ví dụ: LOGIN, LOGOUT, CREATE_ASSIGNMENT, GRADE_SUBMISSION, RESET_PASSWORD, LOCK_USER
    target_type TEXT, -- users, assignments, submissions, classes
    target_id INTEGER,
    ip_address TEXT,
    details TEXT, -- JSON chi tiết tham số thực hiện
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bảng kiểm soát số lần đăng nhập sai (Brute-force protection)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    failed_count INTEGER NOT NULL DEFAULT 1,
    lock_until DATETIME DEFAULT NULL,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Bảng cấu hình hệ thống & AI (Gemini API Key, v.v.)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bảng lưu trữ lịch sử học sinh hỏi AI (Gia sư Socratic & Gợi ý)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
    interaction_type TEXT NOT NULL, -- 'tutor_chat', 'hint_idea', 'hint_steps', 'explanation'
    question_index INTEGER DEFAULT 1,
    question_title TEXT,
    prompt_text TEXT NOT NULL, -- Nội dung câu hỏi / thắc mắc học sinh nhập
    response_text TEXT NOT NULL, -- Phản hồi gợi ý / hướng dẫn của AI
    source TEXT, -- 'gemini', 'groq', 'rule-based', v.v.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. Bảng lưu trữ chẩn đoán lỗ hổng kiến thức từ AI (AI Knowledge Diagnostics)
CREATE TABLE IF NOT EXISTS ai_diagnostics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high'
    severity_label TEXT NOT NULL,
    main_topic TEXT,
    specific_gap TEXT,
    root_cause TEXT,
    pedagogical_impact TEXT,
    action_plan TEXT, -- JSON array of recommendations
    suggested_exercise TEXT,
    interaction_count INTEGER DEFAULT 0,
    hint_count INTEGER DEFAULT 0,
    chat_count INTEGER DEFAULT 0,
    last_prompt_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assignment_id)
);

-- Các chỉ mục (Indexes) tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_assign ON assignment_targets(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_targets_target ON assignment_targets(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assign_student ON submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_grades_submission ON grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_ip ON login_attempts(username, ip_address);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_assignment ON ai_interactions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_submission ON ai_interactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_student ON ai_diagnostics(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_assignment ON ai_diagnostics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_severity ON ai_diagnostics(severity);

-- 12. Bảng các Chương học / Chuyên đề lớn (Chapters)
CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(order_index);

-- 13. Bảng bài giảng lý thuyết trong các chương (Lessons)
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Đại số', -- 'Đại số', 'Hình học', 'Hệ thức Vi-ét', 'Bất đẳng thức & Cực trị', 'Toán thực tế'
    summary TEXT,
    content TEXT NOT NULL, -- Nội dung bài giảng Markdown + KaTeX ($...$)
    key_formulas TEXT, -- Công thức trọng tâm dạng text/markdown
    video_url TEXT DEFAULT NULL, -- Link Google Drive hoặc YouTube video bài giảng
    document_url TEXT DEFAULT NULL, -- Link tài liệu bài học (Google Drive hoặc fallback)
    html_content TEXT DEFAULT NULL, -- Nội dung file HTML bài học tương tác
    html_filename TEXT DEFAULT NULL, -- Tên file HTML gốc do giáo viên tải lên
    order_index INTEGER DEFAULT 0,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL, -- NULL: tất cả học sinh được xem
    attachment_url TEXT DEFAULT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_class ON lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created ON lessons(created_at);


