import { useState, useCallback } from 'react';
import { useDataRefetch } from '../lib/socket.jsx';

export default function Incidents() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ fix_applied: '', root_cause: '', prevention: '' });

  const savedName = localStorage.getItem('noc-user') || '';
  const [form, setForm] = useState({ title: '', severity: 'P3', description: '', reported_by: savedName });

  const fetchIncidents = useCallback(async () => {
    const res = await fetch('/api/incidents');
    setEntries(await res.json());
  }, []);

  useDataRefetch('incidents', fetchIncidents);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.reported_by) return;
    localStorage.setItem('noc-user', form.reported_by);
    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ ...form, title: '', description: '' });
    setShowForm(false);
  };

  const handleResolve = async (id) => {
    if (!resolveForm.fix_applied) return;
    await fetch(`/api/incidents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', ...resolveForm }),
    });
    setResolvingId(null);
    setResolveForm({ fix_applied: '', root_cause: '', prevention: '' });
  };

  const handleClaim = async (id) => {
    const name = localStorage.getItem('noc-user') || prompt('Enter your name:');
    if (!name) return;
    localStorage.setItem('noc-user', name);
    await fetch(`/api/incidents/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  };

  const handleDelete = async (id) => {
    await fetch(`/api/incidents/${id}`, { method: 'DELETE' });
  };

  const sevMap = {
    P1: { border: 'border-l-red-500', badge: 'badge-red' },
    P2: { border: 'border-l-orange-500', badge: 'badge-orange' },
    P3: { border: 'border-l-yellow-500', badge: 'badge-yellow' },
    P4: { border: 'border-l-green-500', badge: 'badge-green' },
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
    const diff = Math.max(0, Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString();
  };

  const filtered = entries.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    const q = search.toLowerCase();
    if (q && !i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q) && !(i.affected || '').toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Incidents</h1>
        <p className="text-sm text-text-muted mt-1">Track issues — fixes auto-save to the knowledge base</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          placeholder="Search incidents..."
          className="input md:max-w-xs"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'investigating', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border capitalize ${
                filter === f ? 'bg-accent border-accent text-white' : 'bg-bg-card border-border text-text-secondary hover:border-accent hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="btn btn-primary ml-auto flex-shrink-0" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Report Issue'}
        </button>
      </div>

      {/* Simplified creation form — 3 fields + name */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 animate-fade-in border-accent/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input placeholder="What's the issue?" className="input sm:col-span-2" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            <select className="input cursor-pointer" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option>
              <option value="P4">P4 — Low</option>
            </select>
          </div>
          <textarea placeholder="Describe what happened..." className="input min-h-[80px] mb-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          <div className="flex gap-3 items-center">
            <input placeholder="Your name" className="input w-48" value={form.reported_by} onChange={e => setForm({...form, reported_by: e.target.value})} required />
            <button type="submit" className="btn btn-primary">Report</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No incidents found.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(i => {
            const sev = sevMap[i.severity] || sevMap.P3;
            const isResolved = i.status === 'resolved';
            const isResolving = resolvingId === i.id;

            return (
              <div key={i.id} className={`card border-l-4 ${sev.border} group`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{i.title}</h3>
                  <div className="flex gap-2">
                    {isResolved ? (
                      <span className="badge badge-green">Resolved</span>
                    ) : i.status === 'investigating' ? (
                      <span className="badge badge-yellow animate-pulse">Investigating</span>
                    ) : (
                      <span className="badge badge-red animate-pulse-red">Open</span>
                    )}
                    <span className={`badge ${sev.badge}`}>{i.severity}</span>
                  </div>
                </div>

                <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed mb-3">{i.description}</div>

                {(i.fix_applied || i.root_cause) && (
                  <div className="bg-black/20 rounded-lg p-3 text-sm space-y-1 mb-3">
                    {i.root_cause && <div><span className="text-text-muted">Root cause:</span> <span className="text-text-primary">{i.root_cause}</span></div>}
                    {i.fix_applied && <div><span className="text-text-muted">Fix:</span> <span className="text-green-400">{i.fix_applied}</span></div>}
                    {i.prevention && <div><span className="text-text-muted">Prevention:</span> <span className="text-text-primary">{i.prevention}</span></div>}
                  </div>
                )}

                {/* Inline resolve form — expands on click, one required field */}
                {isResolving && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 mb-3 animate-fade-in">
                    <input
                      placeholder="What fixed it? *"
                      className="input mb-2"
                      value={resolveForm.fix_applied}
                      onChange={e => setResolveForm({...resolveForm, fix_applied: e.target.value})}
                      autoFocus
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <input placeholder="Root cause (optional)" className="input" value={resolveForm.root_cause} onChange={e => setResolveForm({...resolveForm, root_cause: e.target.value})} />
                      <input placeholder="How to prevent (optional)" className="input" value={resolveForm.prevention} onChange={e => setResolveForm({...resolveForm, prevention: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResolve(i.id)} className="btn btn-primary bg-gradient-to-r from-green-600 to-emerald-600 text-sm">Resolve</button>
                      <button onClick={() => setResolvingId(null)} className="btn btn-ghost text-sm">Cancel</button>
                    </div>
                    <div className="text-xs text-text-muted mt-2">The fix will auto-save to the knowledge base</div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-border/50 text-xs text-text-muted">
                  <span>
                    {i.claimed_by ? (
                      <><span className="text-yellow-400">{i.claimed_by}</span> investigating</>
                    ) : (
                      <>By <strong className="text-text-primary">{i.reported_by}</strong></>
                    )}
                    <span className="mx-1">&bull;</span>{timeAgo(i.created_at)}
                    {i.resolved_at && <><span className="mx-1">&bull;</span>Resolved {timeAgo(i.resolved_at)}</>}
                  </span>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i.status === 'open' && (
                      <button onClick={() => handleClaim(i.id)} className="text-blue-400 hover:text-blue-300 hover:underline">I'm on it</button>
                    )}
                    {!isResolved && !isResolving && (
                      <button
                        onClick={() => { setResolvingId(i.id); setResolveForm({ fix_applied: '', root_cause: '', prevention: '' }); }}
                        className="text-green-400 hover:text-green-300 hover:underline"
                      >
                        Resolve
                      </button>
                    )}
                    <button onClick={() => handleDelete(i.id)} className="text-red-400 hover:text-red-300 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
