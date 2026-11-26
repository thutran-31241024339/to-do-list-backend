const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'tasks.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Personal',
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
    due_date TEXT DEFAULT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const validPriorities = ['low', 'medium', 'high'];
const validStatuses = ['todo', 'doing', 'done'];

app.get('/api/tasks', (req, res) => {
  const { search = '', status = 'all', category = 'all' } = req.query;
  let sql = 'SELECT * FROM tasks WHERE (title LIKE ? OR description LIKE ?)';
  const params = [`%${search}%`, `%${search}%`];
  if (status !== 'all') { sql += ' AND status = ?'; params.push(status); }
  if (category !== 'all') { sql += ' AND category = ?'; params.push(category); }
  sql += ` ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           CASE status WHEN 'todo' THEN 1 WHEN 'doing' THEN 2 ELSE 3 END,
           due_date IS NULL, due_date ASC, created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/stats', (req, res) => {
  const counts = db.prepare(`
    SELECT COUNT(*) total,
      SUM(status = 'todo') todo,
      SUM(status = 'doing') doing,
      SUM(status = 'done') done
    FROM tasks
  `).get();
  const categories = db.prepare(`
    SELECT category, COUNT(*) count FROM tasks GROUP BY category ORDER BY count DESC
  `).all();
  const overdue = db.prepare(`
    SELECT COUNT(*) count FROM tasks
    WHERE status != 'done' AND due_date IS NOT NULL AND due_date < date('now','localtime')
  `).get().count;
  res.json({ ...counts, overdue, categories });
});

app.post('/api/tasks', (req, res) => {
  const task = normalizeTask(req.body);
  if (!task.title) return res.status(400).json({ error: 'Vui lòng nhập tên công việc.' });
  const result = db.prepare(`
    INSERT INTO tasks (title, description, category, priority, status, due_date)
    VALUES (@title, @description, @category, @priority, @status, @due_date)
  `).run(task);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/tasks/:id', (req, res) => {
  const task = normalizeTask(req.body);
  if (!task.title) return res.status(400).json({ error: 'Tên công việc không được để trống.' });
  const result = db.prepare(`
    UPDATE tasks SET title=@title, description=@description, category=@category,
      priority=@priority, status=@status, due_date=@due_date, updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({ ...task, id: req.params.id });
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

app.patch('/api/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
  const result = db.prepare('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

app.delete('/api/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy công việc.' });
  res.json({ success: true });
});

function normalizeTask(body) {
  return {
    title: String(body.title || '').trim().slice(0, 120),
    description: String(body.description || '').trim().slice(0, 1000),
    category: String(body.category || 'Personal').trim().slice(0, 40),
    priority: validPriorities.includes(body.priority) ? body.priority : 'medium',
    status: validStatuses.includes(body.status) ? body.status : 'todo',
    due_date: body.due_date || null
  };
}

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✨ Cutie To-do is running at http://localhost:${PORT}`));
