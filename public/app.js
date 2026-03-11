// ===== NAV & TABS =====
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById('live-clock').textContent = now.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
setInterval(updateClock, 1000);
updateClock();

// ===== TOAST =====
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===== API HELPER =====
async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api/' + path, opts);
  return res.json();
}

// ===== TIME FORMATTING =====
function timeAgo(dateStr) {
  const d = new Date(dateStr + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ========================================
// TEAM BOARD
// ========================================
let teamData = [];

async function loadTeam() {
  teamData = await api('team');
  renderTeam();
}

function renderTeam() {
  const el = document.getElementById('team-entries');
  if (!teamData.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No one has posted yet. Update your status above!</p></div>';
    return;
  }
  el.innerHTML = teamData.map(t => {
    const statusMap = { working: ['🟢','Working','badge-green'], investigating: ['🟡','Investigating','badge-yellow'], blocked: ['🔴','Blocked','badge-red'], break: ['⚪','On Break','badge-muted'] };
    const s = statusMap[t.status] || statusMap.working;
    return `<div class="entry-card team-${t.status}">
      <div class="entry-header">
        <span class="entry-title">${escHtml(t.name)}</span>
        <span class="badge ${s[2]}">${s[0]} ${s[1]}</span>
      </div>
      <div class="entry-body">${escHtml(t.activity)}</div>
      <div class="entry-meta">Updated ${timeAgo(t.updated_at)}</div>
      <div class="entry-actions"><button class="btn btn-sm btn-danger" onclick="deleteTeam(${t.id})">Remove</button></div>
    </div>`;
  }).join('');
}

async function submitTeam() {
  const name = document.getElementById('team-name').value.trim();
  const activity = document.getElementById('team-activity').value.trim();
  const status = document.getElementById('team-status').value;
  if (!name || !activity) return toast('Fill in your name and activity');
  await api('team', 'POST', { name, activity, status });
  document.getElementById('team-activity').value = '';
  toast('Status updated!');
  loadTeam();
}

async function deleteTeam(id) {
  await api('team/' + id, 'DELETE');
  loadTeam();
}

// ========================================
// RUNBOOK
// ========================================
let runbookData = [];
let runbookFilter = 'all';

async function loadRunbook() {
  runbookData = await api('runbook');
  renderRunbook();
}

function renderRunbook() {
  const search = (document.getElementById('runbook-search').value || '').toLowerCase();
  const filtered = runbookData.filter(r => {
    if (runbookFilter !== 'all' && r.category !== runbookFilter) return false;
    if (search && !r.title.toLowerCase().includes(search) && !r.content.toLowerCase().includes(search) && !(r.tags || '').toLowerCase().includes(search)) return false;
    return true;
  });
  const el = document.getElementById('runbook-entries');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><p>No entries yet. Add procedures and known fixes so the team can reference them.</p></div>';
    return;
  }
  el.innerHTML = filtered.map(r => {
    const catMap = { procedure: ['📋','Procedure','cat-procedure'], 'known-fix': ['🔧','Known Fix','cat-known-fix'], reference: ['📝','Reference','cat-reference'] };
    const c = catMap[r.category] || catMap.procedure;
    const tags = r.tags ? r.tags.split(',').map(t => `<span class="badge badge-muted">${escHtml(t.trim())}</span>`).join(' ') : '';
    return `<div class="entry-card">
      <div class="entry-header">
        <span class="entry-title">${escHtml(r.title)}</span>
        <span class="badge ${c[2]}">${c[0]} ${c[1]}</span>
      </div>
      <div class="entry-body">${escHtml(r.content)}</div>
      <div class="entry-meta">By ${escHtml(r.author)} • ${timeAgo(r.created_at)} ${tags ? '• ' + tags : ''}</div>
      <div class="entry-actions"><button class="btn btn-sm btn-danger" onclick="deleteRunbook(${r.id})">Delete</button></div>
    </div>`;
  }).join('');
}

function toggleRunbookForm() {
  document.getElementById('runbook-form').classList.toggle('hidden');
}

function filterRunbook() { renderRunbook(); }

function filterRunbookCat(cat, btn) {
  runbookFilter = cat;
  document.querySelectorAll('#tab-runbook .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRunbook();
}

async function submitRunbook() {
  const title = document.getElementById('rb-title').value.trim();
  const category = document.getElementById('rb-category').value;
  const content = document.getElementById('rb-content').value.trim();
  const author = document.getElementById('rb-author').value.trim();
  const tags = document.getElementById('rb-tags').value.trim();
  if (!title || !content || !author) return toast('Fill in title, content, and author');
  await api('runbook', 'POST', { title, category, content, author, tags });
  document.getElementById('rb-title').value = '';
  document.getElementById('rb-content').value = '';
  document.getElementById('rb-tags').value = '';
  toggleRunbookForm();
  toast('Runbook entry saved!');
  loadRunbook();
}

async function deleteRunbook(id) {
  await api('runbook/' + id, 'DELETE');
  loadRunbook();
}

// ========================================
// INCIDENTS
// ========================================
let incidentData = [];
let incidentFilter = 'all';

async function loadIncidents() {
  incidentData = await api('incidents');
  renderIncidents();
}

function renderIncidents() {
  const search = (document.getElementById('incident-search').value || '').toLowerCase();
  const filtered = incidentData.filter(i => {
    if (incidentFilter !== 'all' && i.status !== incidentFilter) return false;
    if (search && !i.title.toLowerCase().includes(search) && !i.description.toLowerCase().includes(search) && !(i.affected || '').toLowerCase().includes(search)) return false;
    return true;
  });
  const el = document.getElementById('incident-entries');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🚨</div><p>No incidents logged. When issues happen, log them here so the team learns from them.</p></div>';
    return;
  }
  el.innerHTML = filtered.map(i => {
    const sevMap = { P1: 'badge-red', P2: 'badge-orange', P3: 'badge-yellow', P4: 'badge-green' };
    const statusBadge = i.status === 'resolved' ? '<span class="badge badge-green">✅ Resolved</span>' : '<span class="badge badge-red">🔴 Open</span>';
    const sections = [];
    if (i.root_cause) sections.push(`<div><strong>Root Cause:</strong> ${escHtml(i.root_cause)}</div>`);
    if (i.fix_applied) sections.push(`<div><strong>Fix:</strong> ${escHtml(i.fix_applied)}</div>`);
    if (i.prevention) sections.push(`<div><strong>Prevention:</strong> ${escHtml(i.prevention)}</div>`);
    const resolveBtn = i.status !== 'resolved' ? `<button class="btn btn-sm btn-ghost" onclick="resolveIncident(${i.id})">✅ Resolve</button>` : '';
    return `<div class="entry-card severity-${i.severity}">
      <div class="entry-header">
        <span class="entry-title">${escHtml(i.title)}</span>
        <div style="display:flex;gap:6px">${statusBadge}<span class="badge ${sevMap[i.severity]}">${i.severity}</span></div>
      </div>
      <div class="entry-body">${escHtml(i.description)}</div>
      ${i.affected ? `<div class="entry-meta" style="margin-top:6px">Affected: ${escHtml(i.affected)}</div>` : ''}
      ${sections.length ? `<div style="margin-top:10px;font-size:0.85rem;color:var(--text-secondary)">${sections.join('')}</div>` : ''}
      <div class="entry-meta">By ${escHtml(i.reported_by)} • ${timeAgo(i.created_at)}</div>
      <div class="entry-actions">${resolveBtn}<button class="btn btn-sm btn-danger" onclick="deleteIncident(${i.id})">Delete</button></div>
    </div>`;
  }).join('');
}

function toggleIncidentForm() {
  document.getElementById('incident-form').classList.toggle('hidden');
}

function filterIncidents() { renderIncidents(); }

function filterIncidentStatus(status, btn) {
  incidentFilter = status;
  document.querySelectorAll('#tab-incidents .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderIncidents();
}

async function submitIncident() {
  const title = document.getElementById('inc-title').value.trim();
  const severity = document.getElementById('inc-severity').value;
  const affected = document.getElementById('inc-affected').value.trim();
  const description = document.getElementById('inc-desc').value.trim();
  const root_cause = document.getElementById('inc-rootcause').value.trim();
  const fix_applied = document.getElementById('inc-fix').value.trim();
  const prevention = document.getElementById('inc-prevention').value.trim();
  const reported_by = document.getElementById('inc-reporter').value.trim();
  if (!title || !description || !reported_by) return toast('Fill in title, description, and reporter');
  await api('incidents', 'POST', { title, severity, affected, description, root_cause, fix_applied, prevention, reported_by });
  ['inc-title','inc-affected','inc-desc','inc-rootcause','inc-fix','inc-prevention'].forEach(id => document.getElementById(id).value = '');
  toggleIncidentForm();
  toast('Incident logged!');
  loadIncidents();
}

async function resolveIncident(id) {
  const inc = incidentData.find(i => i.id === id);
  if (!inc) return;
  const root_cause = prompt('Root cause:', inc.root_cause || '') || inc.root_cause || '';
  const fix_applied = prompt('Fix applied:', inc.fix_applied || '') || inc.fix_applied || '';
  const prevention = prompt('How to prevent:', inc.prevention || '') || inc.prevention || '';
  await api('incidents/' + id, 'PUT', { status: 'resolved', root_cause, fix_applied, prevention });
  toast('Incident resolved!');
  loadIncidents();
}

async function deleteIncident(id) {
  await api('incidents/' + id, 'DELETE');
  loadIncidents();
}

// ========================================
// VENDORS
// ========================================
let vendorData = [];

async function loadVendors() {
  vendorData = await api('vendors');
  renderVendors();
}

function renderVendors() {
  const el = document.getElementById('vendor-entries');
  if (!vendorData.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📡</div><p>No vendors added. Add your vendor connections to monitor their status.</p></div>';
    return;
  }
  el.innerHTML = vendorData.map(v => {
    const statusMap = { online: ['Online','badge-green','online'], degraded: ['Degraded','badge-yellow','degraded'], offline: ['Offline','badge-red','offline'] };
    const s = statusMap[v.status] || statusMap.online;
    return `<div class="entry-card vendor-${v.status}">
      <div class="entry-header">
        <span class="entry-title"><span class="status-dot ${s[2]}"></span>${escHtml(v.name)}</span>
        <span class="badge ${s[1]}">${s[0]}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.82rem;color:var(--text-secondary);margin:8px 0">
        ${v.ip ? `<div>IP: <strong>${escHtml(v.ip)}</strong></div>` : ''}
        ${v.port ? `<div>Port: <strong>${escHtml(v.port)}</strong></div>` : ''}
        ${v.latency ? `<div>Latency: <strong>${escHtml(v.latency)}ms</strong></div>` : ''}
        ${v.dlr_rate ? `<div>DLR: <strong>${escHtml(v.dlr_rate)}%</strong></div>` : ''}
      </div>
      ${v.notes ? `<div class="entry-body" style="font-size:0.82rem">${escHtml(v.notes)}</div>` : ''}
      <div class="entry-meta">Last checked: ${timeAgo(v.last_checked)}</div>
      <div class="entry-actions">
        <button class="btn btn-sm btn-ghost" onclick="updateVendorStatus(${v.id},'online')">🟢</button>
        <button class="btn btn-sm btn-ghost" onclick="updateVendorStatus(${v.id},'degraded')">🟡</button>
        <button class="btn btn-sm btn-ghost" onclick="updateVendorStatus(${v.id},'offline')">🔴</button>
        <button class="btn btn-sm btn-danger" onclick="deleteVendor(${v.id})">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function toggleVendorForm() {
  document.getElementById('vendor-form').classList.toggle('hidden');
}

async function submitVendor() {
  const name = document.getElementById('ven-name').value.trim();
  const ip = document.getElementById('ven-ip').value.trim();
  const port = document.getElementById('ven-port').value.trim();
  const status = document.getElementById('ven-status').value;
  const latency = document.getElementById('ven-latency').value.trim();
  const dlr_rate = document.getElementById('ven-dlr').value.trim();
  const notes = document.getElementById('ven-notes').value.trim();
  if (!name) return toast('Enter vendor name');
  await api('vendors', 'POST', { name, ip, port, status, latency, dlr_rate, notes });
  document.getElementById('ven-name').value = '';
  document.getElementById('ven-ip').value = '';
  document.getElementById('ven-notes').value = '';
  document.getElementById('ven-latency').value = '';
  document.getElementById('ven-dlr').value = '';
  toggleVendorForm();
  toast('Vendor added!');
  loadVendors();
}

async function updateVendorStatus(id, status) {
  const v = vendorData.find(x => x.id === id);
  if (v) {
    await api('vendors/' + id, 'PUT', { ...v, status });
    toast(`${v.name} → ${status}`);
    loadVendors();
  }
}

async function deleteVendor(id) {
  await api('vendors/' + id, 'DELETE');
  loadVendors();
}

// ========================================
// SHIFT HANDOFF
// ========================================
let handoffData = [];

async function loadHandoffs() {
  handoffData = await api('handoffs');
  renderHandoffs();
}

function renderHandoffs() {
  const el = document.getElementById('handoff-entries');
  if (!handoffData.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔄</div><p>No handoffs yet. Submit one at the end of your shift!</p></div>';
    return;
  }
  el.innerHTML = handoffData.map(h => {
    const sections = [
      { label: '🔴 Active Issues', val: h.active_issues },
      { label: '✅ Resolved', val: h.resolved },
      { label: '⚠️ Alarms', val: h.alarms },
      { label: '📡 Vendor Status', val: h.vendor_status },
      { label: '📝 Notes for Next Shift', val: h.notes_next }
    ].filter(s => s.val).map(s => `<div class="handoff-section"><div class="handoff-label">${s.label}</div><div class="handoff-content">${escHtml(s.val)}</div></div>`).join('');
    return `<div class="handoff-card">
      <div class="entry-header">
        <span class="entry-title">${escHtml(h.shift_by)}${h.shift_time ? ' • ' + escHtml(h.shift_time) : ''}</span>
        <span class="entry-meta">${timeAgo(h.created_at)}</span>
      </div>
      ${sections}
      <div class="entry-actions"><button class="btn btn-sm btn-danger" onclick="deleteHandoff(${h.id})">Delete</button></div>
    </div>`;
  }).join('');
}

async function submitHandoff() {
  const shift_by = document.getElementById('ho-name').value.trim();
  const shift_time = document.getElementById('ho-time').value.trim();
  const active_issues = document.getElementById('ho-active').value.trim();
  const resolved = document.getElementById('ho-resolved').value.trim();
  const alarms = document.getElementById('ho-alarms').value.trim();
  const vendor_status = document.getElementById('ho-vendors').value.trim();
  const notes_next = document.getElementById('ho-notes').value.trim();
  if (!shift_by) return toast('Enter your name');
  if (!active_issues && !resolved && !notes_next) return toast('Fill in at least one section');
  await api('handoffs', 'POST', { shift_by, shift_time, active_issues, resolved, alarms, vendor_status, notes_next });
  ['ho-active','ho-resolved','ho-alarms','ho-vendors','ho-notes'].forEach(id => document.getElementById(id).value = '');
  toast('Handoff submitted!');
  loadHandoffs();
}

async function deleteHandoff(id) {
  await api('handoffs/' + id, 'DELETE');
  loadHandoffs();
}

// ===== INIT =====
loadTeam();
loadRunbook();
loadIncidents();
loadVendors();
loadHandoffs();
