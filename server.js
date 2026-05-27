import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'training-journal-secret-change-in-production';
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || join(__dirname, 'data.db');

// ========== Database ==========
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL,
    intensity INTEGER NOT NULL,
    feedback TEXT DEFAULT '',
    distance REAL,
    pace TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// ========== Express App ==========
const app = express();

app.use(cors());
app.use(express.json());

// ========== Auth Middleware ==========
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ========== Auth Routes ==========

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名需要 2-20 个字符' });
  }
  if (password.length < 4 || password.length > 64) {
    return res.status(400).json({ error: '密码需要 4-64 个字符' });
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, hash);

    const token = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '30d' });

    // Initialize with some sample data for new users
    const today = new Date().toISOString().slice(0, 10);
    res.json({ token, user: { id: result.lastInsertRowid, username } });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '用户名已被使用' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.userId, username: req.username } });
});

// ========== Workout Routes ==========

// Get all workouts for user
app.get('/api/workouts', authMiddleware, (req, res) => {
  try {
    const workouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(req.userId);
    // Map SQLite row names to camelCase for frontend
    const mapped = workouts.map(w => ({
      id: w.id,
      type: w.type,
      date: w.date,
      duration: w.duration,
      intensity: w.intensity,
      feedback: w.feedback,
      distance: w.distance,
      pace: w.pace,
      createdAt: w.created_at,
    }));
    res.json({ workouts: mapped });
  } catch (err) {
    console.error('Get workouts error:', err);
    res.status(500).json({ error: '获取数据失败' });
  }
});

// Add workout
app.post('/api/workouts', authMiddleware, (req, res) => {
  const { id, type, date, duration, intensity, feedback, distance, pace, createdAt } = req.body;

  if (!id || !type || !date || !duration || !intensity) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  try {
    db.prepare(`
      INSERT INTO workouts (id, user_id, type, date, duration, intensity, feedback, distance, pace, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, type, date, duration, intensity, feedback || '', distance || null, pace || null, createdAt || new Date().toISOString());

    res.json({ success: true });
  } catch (err) {
    console.error('Add workout error:', err);
    res.status(500).json({ error: '保存失败' });
  }
});

// Delete workout
app.delete('/api/workouts/:id', authMiddleware, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete workout error:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ========== Static Files (Frontend) ==========
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  try {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  } catch {
    res.status(404).send('Not found');
  }
});

// ========== Start Server ==========
app.listen(PORT, () => {
  console.log(`🏃 训练日志服务器已启动: http://localhost:${PORT}`);
  console.log(`📁 数据库: ${DB_PATH}`);
});
