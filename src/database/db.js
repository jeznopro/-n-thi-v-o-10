const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Đảm bảo thư mục lưu CSDL tồn tại
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Khởi tạo kết nối SQLite với cấu hình tối ưu
const db = new Database(path.resolve(dbPath), {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Kích hoạt Write-Ahead Logging (WAL) để tăng tốc độ ghi/đọc đồng thời
db.pragma('journal_mode = WAL');
// Kích hoạt kiểm tra toàn vẹn khóa ngoại
db.pragma('foreign_keys = ON');

// Đọc và khởi tạo schema nếu chưa có
function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// Khởi tạo bảng ngay khi load module
initSchema();

module.exports = db;
