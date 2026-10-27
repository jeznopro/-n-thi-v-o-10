const db = require('../src/database/db');

try {
  db.exec('ALTER TABLE assignments ADD COLUMN chapter_id INTEGER DEFAULT NULL');
  console.log('✅ Added column chapter_id to assignments');
} catch (e) {
  console.log('ℹ️ Column chapter_id already exists or:', e.message);
}

// Map the 4 review exams to their corresponding review chapters
const ch11 = db.prepare('SELECT id FROM chapters WHERE order_index = 11 LIMIT 1').get();
const ch12 = db.prepare('SELECT id FROM chapters WHERE order_index = 12 LIMIT 1').get();
const ch13 = db.prepare('SELECT id FROM chapters WHERE order_index = 13 LIMIT 1').get();
const ch14 = db.prepare('SELECT id FROM chapters WHERE order_index = 14 LIMIT 1').get();

if (ch11) db.prepare("UPDATE assignments SET chapter_id = ? WHERE title LIKE '%Giữa kỳ 1%'").run(ch11.id);
if (ch12) db.prepare("UPDATE assignments SET chapter_id = ? WHERE title LIKE '%Cuối kỳ 1%'").run(ch12.id);
if (ch13) db.prepare("UPDATE assignments SET chapter_id = ? WHERE title LIKE '%Giữa kỳ 2%'").run(ch13.id);
if (ch14) db.prepare("UPDATE assignments SET chapter_id = ? WHERE title LIKE '%Cuối kỳ 2%' OR title LIKE '%vào lớp 10%'").run(ch14.id);

console.log('--- ASSIGNMENTS WITH CHAPTER ---');
console.table(db.prepare('SELECT a.id, a.title, a.chapter_id, c.title as chapter_title FROM assignments a LEFT JOIN chapters c ON a.chapter_id = c.id').all());
