/**
 * Chuyển chuỗi thời gian SQLite (UTC) thành timestamp milliseconds chính xác
 * @param {string|Date} dateVal
 * @returns {number}
 */
function parseSqliteUtc(dateVal) {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  let str = String(dateVal).trim();
  if (!str.includes('T') && !str.includes('Z')) {
    // Chuyển 'YYYY-MM-DD HH:mm:ss' thành ISO UTC 'YYYY-MM-DDTHH:mm:ssZ'
    str = str.replace(' ', 'T') + 'Z';
  }
  return new Date(str).getTime();
}

/**
 * Kiểm tra xem thời điểm nộp có bị trễ hạn hay không
 * @param {string|Date} dueDate Hạn chót
 * @param {string|Date} [submitTime] Thời điểm nộp (mặc định là hiện tại)
 * @returns {boolean}
 */
function isLateSubmission(dueDate, submitTime = new Date()) {
  const due = parseSqliteUtc(dueDate);
  const submitted = parseSqliteUtc(submitTime);
  return submitted > due;
}

/**
 * Tính số giây còn lại cho bài thi có giới hạn thời gian
 * @param {string|Date} startedAt Thời điểm học sinh bắt đầu làm bài
 * @param {number} timeLimitMinutes Thời lượng làm bài (phút)
 * @returns {number} Số giây còn lại (<= 0 là đã hết giờ)
 */
function calculateRemainingSeconds(startedAt, timeLimitMinutes) {
  if (!timeLimitMinutes) return null; // Không giới hạn giờ

  const startMs = parseSqliteUtc(startedAt);
  const durationMs = timeLimitMinutes * 60 * 1000;
  const deadlineMs = startMs + durationMs;
  const nowMs = Date.now();

  const remainingMs = deadlineMs - nowMs;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Định dạng thời gian chuẩn VN YYYY-MM-DD HH:mm:ss
 */
function formatCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  parseSqliteUtc,
  isLateSubmission,
  calculateRemainingSeconds,
  formatCurrentDateTime
};
