const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'noc-hub.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS team_board (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      activity TEXT NOT NULL,
      status TEXT DEFAULT 'working',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS runbook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      affected TEXT DEFAULT '',
      description TEXT NOT NULL,
      root_cause TEXT DEFAULT '',
      fix_applied TEXT DEFAULT '',
      prevention TEXT DEFAULT '',
      reported_by TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT (datetime('now')),
      resolved_at DATETIME
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT DEFAULT '',
      port TEXT DEFAULT '2775',
      status TEXT DEFAULT 'online',
      latency TEXT DEFAULT '',
      dlr_rate TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      last_checked DATETIME DEFAULT (datetime('now')),
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS handoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_by TEXT NOT NULL,
      shift_time TEXT DEFAULT '',
      active_issues TEXT DEFAULT '',
      resolved TEXT DEFAULT '',
      alarms TEXT DEFAULT '',
      vendor_status TEXT DEFAULT '',
      notes_next TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  saveDb();
}

// Helper to run SELECT queries and return array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

// --- Team Board API ---
app.get('/api/team', (req, res) => {
  res.json(queryAll('SELECT * FROM team_board ORDER BY updated_at DESC'));
});

app.post('/api/team', (req, res) => {
  const { name, activity, status } = req.body;
  const existing = queryOne('SELECT id FROM team_board WHERE name = ?', [name]);
  if (existing) {
    db.run("UPDATE team_board SET activity = ?, status = ?, updated_at = datetime('now') WHERE name = ?", [activity, status || 'working', name]);
  } else {
    db.run('INSERT INTO team_board (name, activity, status) VALUES (?, ?, ?)', [name, activity, status || 'working']);
  }
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/team/:id', (req, res) => {
  db.run('DELETE FROM team_board WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

// --- Runbook API ---
app.get('/api/runbook', (req, res) => {
  res.json(queryAll('SELECT * FROM runbook ORDER BY created_at DESC'));
});

app.post('/api/runbook', (req, res) => {
  const { title, category, content, author, tags } = req.body;
  db.run('INSERT INTO runbook (title, category, content, author, tags) VALUES (?, ?, ?, ?, ?)', [title, category, content, author, tags || '']);
  saveDb();
  res.json({ ok: true });
});

app.put('/api/runbook/:id', (req, res) => {
  const { title, category, content, tags } = req.body;
  db.run("UPDATE runbook SET title=?, category=?, content=?, tags=?, updated_at=datetime('now') WHERE id=?", [title, category, content, tags || '', Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/runbook/:id', (req, res) => {
  db.run('DELETE FROM runbook WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

// --- Incidents API ---
app.get('/api/incidents', (req, res) => {
  res.json(queryAll('SELECT * FROM incidents ORDER BY created_at DESC'));
});

app.post('/api/incidents', (req, res) => {
  const { title, severity, affected, description, root_cause, fix_applied, prevention, reported_by } = req.body;
  db.run('INSERT INTO incidents (title, severity, affected, description, root_cause, fix_applied, prevention, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, severity, affected || '', description, root_cause || '', fix_applied || '', prevention || '', reported_by]);
  saveDb();
  res.json({ ok: true });
});

app.put('/api/incidents/:id', (req, res) => {
  const { status, root_cause, fix_applied, prevention } = req.body;
  const resolved = status === 'resolved' ? new Date().toISOString() : null;
  db.run('UPDATE incidents SET status=?, root_cause=?, fix_applied=?, prevention=?, resolved_at=? WHERE id=?',
    [status, root_cause, fix_applied, prevention, resolved, Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/incidents/:id', (req, res) => {
  db.run('DELETE FROM incidents WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

// --- Vendors API ---
app.get('/api/vendors', (req, res) => {
  res.json(queryAll('SELECT * FROM vendors ORDER BY name ASC'));
});

app.post('/api/vendors', (req, res) => {
  const { name, ip, port, status, latency, dlr_rate, notes } = req.body;
  db.run('INSERT INTO vendors (name, ip, port, status, latency, dlr_rate, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, ip || '', port || '2775', status || 'online', latency || '', dlr_rate || '', notes || '']);
  saveDb();
  res.json({ ok: true });
});

app.put('/api/vendors/:id', (req, res) => {
  const { name, ip, port, status, latency, dlr_rate, notes } = req.body;
  db.run("UPDATE vendors SET name=?, ip=?, port=?, status=?, latency=?, dlr_rate=?, notes=?, last_checked=datetime('now') WHERE id=?",
    [name, ip, port, status, latency, dlr_rate, notes, Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/vendors/:id', (req, res) => {
  db.run('DELETE FROM vendors WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

// --- Handoffs API ---
app.get('/api/handoffs', (req, res) => {
  res.json(queryAll('SELECT * FROM handoffs ORDER BY created_at DESC LIMIT 20'));
});

app.post('/api/handoffs', (req, res) => {
  const { shift_by, shift_time, active_issues, resolved, alarms, vendor_status, notes_next } = req.body;
  db.run('INSERT INTO handoffs (shift_by, shift_time, active_issues, resolved, alarms, vendor_status, notes_next) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [shift_by, shift_time || '', active_issues || '', resolved || '', alarms || '', vendor_status || '', notes_next || '']);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/handoffs/:id', (req, res) => {
  db.run('DELETE FROM handoffs WHERE id = ?', [Number(req.params.id)]);
  saveDb();
  res.json({ ok: true });
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start ---
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  NOC Team Hub running at http://localhost:${PORT}\n`);
  });
});
