const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const net = require('net');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'noc-hub.db');

const SHIFTS = [
  { name: 'Morning', startHour: 9, endHour: 17, label: '09:00 – 17:00' },
  { name: 'Evening', startHour: 17, endHour: 0, label: '17:00 – 00:00' },
  { name: 'Night', startHour: 0, endHour: 9, label: '00:00 – 09:00' },
];

function getCurrentShift() {
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();

  let shift;
  if (hour >= 9 && hour < 17) shift = SHIFTS[0];
  else if (hour >= 17) shift = SHIFTS[1];
  else shift = SHIFTS[2];

  const elapsed = hour >= shift.startHour
    ? (hour - shift.startHour) + min / 60
    : (hour + 24 - shift.startHour) + min / 60;
  const duration = shift.endHour > shift.startHour
    ? shift.endHour - shift.startHour
    : (24 - shift.startHour) + shift.endHour;
  const remaining = Math.max(0, duration - elapsed);

  return { ...shift, elapsed: Math.round(elapsed * 10) / 10, remaining: Math.round(remaining * 10) / 10, duration };
}

function getShiftCutoff() {
  const now = new Date();
  const hour = now.getHours();
  const cutoff = new Date(now);
  cutoff.setMinutes(0, 0, 0);
  if (hour >= 9 && hour < 17) cutoff.setHours(9);
  else if (hour >= 17) cutoff.setHours(17);
  else cutoff.setHours(0);
  return cutoff.toISOString().replace('T', ' ').slice(0, 19);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function notifyUpdate(topic) {
  io.emit('data_updated', topic);
}

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

function logActivity(type, actor, summary, refType = '', refId = 0) {
  db.run('INSERT INTO activity_log (type, actor, summary, ref_type, ref_id) VALUES (?, ?, ?, ?, ?)',
    [type, actor, summary, refType, refId]);
  saveDb();
  notifyUpdate('activity');
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, ip TEXT DEFAULT '', port TEXT DEFAULT '2775',
    status TEXT DEFAULT 'online', latency TEXT DEFAULT '', dlr_rate TEXT DEFAULT '',
    notes TEXT DEFAULT '', last_checked DATETIME DEFAULT (datetime('now')),
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, severity TEXT NOT NULL, affected TEXT DEFAULT '',
    description TEXT NOT NULL, reported_by TEXT NOT NULL, claimed_by TEXT DEFAULT '',
    status TEXT DEFAULT 'open', fix_applied TEXT DEFAULT '',
    root_cause TEXT DEFAULT '', prevention TEXT DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')), resolved_at DATETIME
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, category TEXT NOT NULL, content TEXT NOT NULL,
    author TEXT NOT NULL, tags TEXT DEFAULT '', source TEXT DEFAULT 'manual',
    incident_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS incident_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL, author TEXT NOT NULL,
    content TEXT NOT NULL, type TEXT DEFAULT 'comment',
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, actor TEXT DEFAULT 'System', summary TEXT NOT NULL,
    ref_type TEXT DEFAULT '', ref_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS handoffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_by TEXT NOT NULL, shift_time TEXT DEFAULT '',
    active_issues TEXT DEFAULT '', resolved TEXT DEFAULT '',
    alarms TEXT DEFAULT '', vendor_status TEXT DEFAULT '',
    notes_next TEXT DEFAULT '', summary TEXT DEFAULT '', notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  // Migrations for older databases
  try { db.run('ALTER TABLE incidents ADD COLUMN claimed_by TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE handoffs ADD COLUMN summary TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE handoffs ADD COLUMN notes TEXT DEFAULT ""'); } catch(e) {}

  // One-time migration: copy old runbook entries into knowledge table
  const knowledgeCount = queryOne('SELECT COUNT(*) as count FROM knowledge');
  if (knowledgeCount && knowledgeCount.count === 0) {
    try {
      const oldEntries = queryAll('SELECT * FROM runbook');
      for (const r of oldEntries) {
        db.run('INSERT INTO knowledge (title, category, content, author, tags, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [r.title, r.category, r.content, r.author, r.tags || '', 'migrated', r.created_at, r.updated_at]);
      }
      if (oldEntries.length > 0) console.log(`Migrated ${oldEntries.length} runbook entries to knowledge base.`);
    } catch(e) { /* runbook table may not exist */ }
  }

  saveDb();
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ─── DASHBOARD (aggregated, zero input) ──────────────────────────────

app.get('/api/dashboard', (req, res) => {
  const vendors = queryAll('SELECT * FROM vendors');
  const openIncidents = queryAll(
    "SELECT * FROM incidents WHERE status != 'resolved' ORDER BY CASE severity WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END"
  );
  const investigating = queryAll("SELECT * FROM incidents WHERE status = 'investigating'");
  const recentActivity = queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 30');
  const resolved24h = queryOne("SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved' AND resolved_at >= datetime('now', '-24 hours')");

  res.json({
    shift: getCurrentShift(),
    vendors: {
      total: vendors.length,
      online: vendors.filter(v => v.status === 'online').length,
      offline: vendors.filter(v => v.status === 'offline').length,
      degraded: vendors.filter(v => v.status === 'degraded').length,
    },
    incidents: {
      open: openIncidents.length,
      p1: openIncidents.filter(i => i.severity === 'P1').length,
      resolvedToday: resolved24h?.count || 0,
      list: openIncidents,
    },
    activeWork: investigating.map(i => ({
      person: i.claimed_by || i.reported_by,
      task: i.title,
      severity: i.severity,
      incident_id: i.id,
      since: i.created_at,
    })),
    activity: recentActivity,
  });
});

app.get('/api/shift', (req, res) => {
  res.json({ current: getCurrentShift(), all: SHIFTS });
});

app.get('/api/activity', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]));
});

// ─── INCIDENTS (simplified: report fast, resolve with one field) ─────

app.get('/api/incidents', (req, res) => {
  res.json(queryAll('SELECT * FROM incidents ORDER BY created_at DESC'));
});

app.post('/api/incidents', (req, res) => {
  const { title, severity, affected, description, reported_by } = req.body;
  if (!title || !description || !reported_by) return res.status(400).json({ error: 'title, description, reported_by required' });

  db.run('INSERT INTO incidents (title, severity, affected, description, reported_by) VALUES (?, ?, ?, ?, ?)',
    [title, severity || 'P3', affected || '', description, reported_by]);

  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  db.run('INSERT INTO incident_updates (incident_id, author, content, type) VALUES (?, ?, ?, ?)',
    [newId, reported_by, `Reported this incident`, 'created']);
  logActivity('incident_created', reported_by, `Reported: ${title}`, 'incident', newId);
  saveDb(); notifyUpdate('incidents');
  res.json({ ok: true, id: newId });
});

app.put('/api/incidents/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status, fix_applied, root_cause, prevention } = req.body;
  const incident = queryOne('SELECT * FROM incidents WHERE id=?', [id]);
  if (!incident) return res.status(404).json({ error: 'not found' });

  if (status === 'resolved') {
    const resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.run('UPDATE incidents SET status=?, fix_applied=?, root_cause=?, prevention=?, resolved_at=? WHERE id=?',
      ['resolved', fix_applied || '', root_cause || '', prevention || '', resolvedAt, id]);

    const resolver = incident.claimed_by || incident.reported_by;
    const resolveNote = fix_applied ? `Resolved — Fix: ${fix_applied}` : 'Resolved';
    db.run('INSERT INTO incident_updates (incident_id, author, content, type) VALUES (?, ?, ?, ?)',
      [id, resolver, resolveNote, 'resolved']);
    logActivity('incident_resolved', resolver, `Resolved: ${incident.title}`, 'incident', id);

    if (fix_applied) {
      let content = '';
      if (root_cause) content += `**Root Cause:** ${root_cause}\n\n`;
      content += `**Fix:** ${fix_applied}`;
      if (prevention) content += `\n\n**Prevention:** ${prevention}`;

      db.run('INSERT INTO knowledge (title, category, content, author, tags, source, incident_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [`Fix: ${incident.title}`, 'known-fix', content, resolver, incident.affected || '', 'auto', id]);
      logActivity('knowledge_added', 'System', `Auto-saved fix for: ${incident.title}`, 'knowledge', 0);
      notifyUpdate('knowledge');
    }
  } else {
    db.run('UPDATE incidents SET status=?, fix_applied=?, root_cause=?, prevention=? WHERE id=?',
      [status || incident.status, fix_applied ?? incident.fix_applied, root_cause ?? incident.root_cause, prevention ?? incident.prevention, id]);
  }

  saveDb(); notifyUpdate('incidents');
  res.json({ ok: true });
});

app.post('/api/incidents/:id/claim', (req, res) => {
  const { name } = req.body;
  const id = Number(req.params.id);
  const incident = queryOne('SELECT * FROM incidents WHERE id=?', [id]);
  if (!incident) return res.status(404).json({ error: 'not found' });

  db.run("UPDATE incidents SET status='investigating', claimed_by=? WHERE id=?", [name, id]);
  db.run('INSERT INTO incident_updates (incident_id, author, content, type) VALUES (?, ?, ?, ?)',
    [id, name, `Claimed this incident — investigating`, 'claimed']);
  logActivity('incident_claimed', name, `Claimed: ${incident.title}`, 'incident', id);
  saveDb(); notifyUpdate('incidents');
  res.json({ ok: true });
});

app.get('/api/incidents/:id/updates', (req, res) => {
  res.json(queryAll('SELECT * FROM incident_updates WHERE incident_id=? ORDER BY created_at ASC', [Number(req.params.id)]));
});

app.post('/api/incidents/:id/updates', (req, res) => {
  const { author, content } = req.body;
  const id = Number(req.params.id);
  if (!content) return res.status(400).json({ error: 'content required' });
  const name = author || localStorage?.getItem?.('noc-user') || 'Unknown';
  db.run('INSERT INTO incident_updates (incident_id, author, content, type) VALUES (?, ?, ?, ?)',
    [id, name, content, 'comment']);
  saveDb(); notifyUpdate('incidents');
  res.json({ ok: true });
});

app.delete('/api/incidents/:id', (req, res) => {
  db.run('DELETE FROM incident_updates WHERE incident_id=?', [Number(req.params.id)]);
  db.run('DELETE FROM incidents WHERE id=?', [Number(req.params.id)]);
  saveDb(); notifyUpdate('incidents');
  res.json({ ok: true });
});

// ─── KNOWLEDGE BASE (procedures + auto-entries from resolved incidents) ──

app.get('/api/knowledge', (req, res) => {
  res.json(queryAll('SELECT * FROM knowledge ORDER BY created_at DESC'));
});

app.post('/api/knowledge', (req, res) => {
  const { title, category, content, author, tags } = req.body;
  if (!title || !content || !author) return res.status(400).json({ error: 'title, content, author required' });

  db.run('INSERT INTO knowledge (title, category, content, author, tags) VALUES (?, ?, ?, ?, ?)',
    [title, category || 'procedure', content, author, tags || '']);
  logActivity('knowledge_added', author, `Added: ${title}`, 'knowledge', 0);
  saveDb(); notifyUpdate('knowledge');
  res.json({ ok: true });
});

app.put('/api/knowledge/:id', (req, res) => {
  const { title, category, content, tags } = req.body;
  db.run("UPDATE knowledge SET title=?, category=?, content=?, tags=?, updated_at=datetime('now') WHERE id=?",
    [title, category, content, tags || '', Number(req.params.id)]);
  saveDb(); notifyUpdate('knowledge');
  res.json({ ok: true });
});

app.delete('/api/knowledge/:id', (req, res) => {
  db.run('DELETE FROM knowledge WHERE id=?', [Number(req.params.id)]);
  saveDb(); notifyUpdate('knowledge');
  res.json({ ok: true });
});

// ─── VENDORS (auto-monitored) ────────────────────────────────────────

app.get('/api/vendors', (req, res) => {
  res.json(queryAll('SELECT * FROM vendors ORDER BY name ASC'));
});

app.post('/api/vendors', (req, res) => {
  const { name, ip, port, status, latency, dlr_rate, notes } = req.body;
  db.run('INSERT INTO vendors (name, ip, port, status, latency, dlr_rate, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, ip || '', port || '2775', status || 'online', latency || '', dlr_rate || '', notes || '']);
  saveDb(); notifyUpdate('vendors');
  res.json({ ok: true });
});

app.put('/api/vendors/:id', (req, res) => {
  const { name, ip, port, status, latency, dlr_rate, notes } = req.body;
  db.run("UPDATE vendors SET name=?, ip=?, port=?, status=?, latency=?, dlr_rate=?, notes=?, last_checked=datetime('now') WHERE id=?",
    [name, ip, port, status, latency, dlr_rate, notes, Number(req.params.id)]);
  saveDb(); notifyUpdate('vendors');
  res.json({ ok: true });
});

app.delete('/api/vendors/:id', (req, res) => {
  db.run('DELETE FROM vendors WHERE id=?', [Number(req.params.id)]);
  saveDb(); notifyUpdate('vendors');
  res.json({ ok: true });
});

// ─── SHIFT HANDOFF (auto-generated summaries) ────────────────────────

app.get('/api/handoffs', (req, res) => {
  res.json(queryAll('SELECT * FROM handoffs ORDER BY created_at DESC LIMIT 20'));
});

app.get('/api/handoffs/generate', (req, res) => {
  const shift = getCurrentShift();
  const cutoff = getShiftCutoff();

  const allRecent = queryAll('SELECT * FROM incidents WHERE created_at >= ? ORDER BY created_at DESC', [cutoff]);
  const resolved = allRecent.filter(i => i.status === 'resolved');
  const active = queryAll("SELECT * FROM incidents WHERE status != 'resolved' ORDER BY severity ASC");

  const vendors = queryAll('SELECT * FROM vendors ORDER BY name');
  const offline = vendors.filter(v => v.status === 'offline');
  const degraded = vendors.filter(v => v.status === 'degraded');

  let summary = `SHIFT: ${shift.name} (${shift.label})\n\n`;

  if (active.length > 0) {
    summary += 'ACTIVE ISSUES:\n';
    active.forEach(i => {
      summary += `  [${i.severity}] ${i.title}`;
      if (i.claimed_by) summary += ` — ${i.claimed_by} investigating`;
      summary += '\n';
    });
  } else {
    summary += 'ACTIVE ISSUES: None — all clear\n';
  }

  summary += '\n';

  if (resolved.length > 0) {
    summary += `RESOLVED THIS SHIFT (${resolved.length}):\n`;
    resolved.forEach(i => {
      summary += `  ${i.title}`;
      if (i.fix_applied) summary += ` — ${i.fix_applied}`;
      summary += '\n';
    });
  } else {
    summary += 'RESOLVED THIS SHIFT: None\n';
  }

  summary += '\n';

  const onlineCount = vendors.filter(v => v.status === 'online').length;
  summary += `VENDORS: ${onlineCount}/${vendors.length} online`;
  if (offline.length > 0) summary += ` | OFFLINE: ${offline.map(v => v.name).join(', ')}`;
  if (degraded.length > 0) summary += ` | Degraded: ${degraded.map(v => v.name).join(', ')}`;
  summary += '\n';

  res.json({
    shift,
    summary,
    active,
    resolved,
    vendors: { online: onlineCount, total: vendors.length, offline: offline.map(v => v.name) },
  });
});

app.post('/api/handoffs', (req, res) => {
  const { shift_by, shift_time, summary, notes } = req.body;
  if (!shift_by) return res.status(400).json({ error: 'shift_by required' });

  db.run('INSERT INTO handoffs (shift_by, shift_time, summary, notes) VALUES (?, ?, ?, ?)',
    [shift_by, shift_time || '', summary || '', notes || '']);
  logActivity('handoff', shift_by, 'Submitted shift handoff', 'handoff', 0);
  saveDb(); notifyUpdate('handoffs');
  res.json({ ok: true });
});

app.delete('/api/handoffs/:id', (req, res) => {
  db.run('DELETE FROM handoffs WHERE id=?', [Number(req.params.id)]);
  saveDb(); notifyUpdate('handoffs');
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// ─── VENDOR MONITOR (background job, auto-detects issues) ───────────

function checkVendor(vendor) {
  return new Promise((resolve) => {
    if (!vendor.ip) return resolve({ ...vendor, newStatus: vendor.status, newLatency: '' });

    const start = Date.now();
    const port = Number(vendor.port) || 2775;
    const sock = new net.Socket();
    sock.setTimeout(3000);

    sock.on('connect', () => {
      const latency = Date.now() - start;
      sock.destroy();
      resolve({ ...vendor, newStatus: 'online', newLatency: latency + 'ms' });
    });
    sock.on('timeout', () => { sock.destroy(); resolve({ ...vendor, newStatus: 'offline', newLatency: 'Timeout' }); });
    sock.on('error', () => { sock.destroy(); resolve({ ...vendor, newStatus: 'offline', newLatency: 'Error' }); });
    sock.connect(port, vendor.ip);
  });
}

function monitorVendors() {
  setInterval(async () => {
    try {
      if (!db) return;
      const vendors = queryAll('SELECT * FROM vendors');
      if (vendors.length === 0) return;

      let changed = false;
      for (const vendor of vendors) {
        if (!vendor.ip) continue;
        const result = await checkVendor(vendor);

        if (result.newStatus !== vendor.status || result.newLatency !== vendor.latency) {
          db.run("UPDATE vendors SET status=?, latency=?, last_checked=datetime('now') WHERE id=?",
            [result.newStatus, result.newLatency, vendor.id]);
          changed = true;

          if (result.newStatus === 'offline' && vendor.status === 'online') {
            logActivity('vendor_offline', 'System', `${vendor.name} (${vendor.ip}) went offline`, 'vendor', vendor.id);
            db.run('INSERT INTO incidents (title, severity, affected, description, reported_by) VALUES (?, ?, ?, ?, ?)',
              [`Vendor ${vendor.name} Offline`, 'P1', vendor.name,
               `Auto-detected: ${vendor.name} (${vendor.ip}:${vendor.port}) is unreachable.`, 'System Monitor']);
            notifyUpdate('incidents');
          }

          if (result.newStatus === 'online' && vendor.status === 'offline') {
            logActivity('vendor_online', 'System', `${vendor.name} (${vendor.ip}) is back online`, 'vendor', vendor.id);
          }
        } else {
          db.run("UPDATE vendors SET last_checked=datetime('now') WHERE id=?", [vendor.id]);
        }
      }

      if (changed) { saveDb(); notifyUpdate('vendors'); }
    } catch (e) {
      console.error('Vendor Monitor Error:', e);
    }
  }, 10000);
}

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`\nNOC Hub running at http://localhost:${PORT}\n`);
    monitorVendors();
  });
});
