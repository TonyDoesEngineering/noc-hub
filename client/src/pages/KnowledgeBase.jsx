import { useState, useCallback } from 'react';
import { useDataRefetch } from '../lib/socket.jsx';

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const savedName = localStorage.getItem('noc-user') || '';
  const [form, setForm] = useState({ title: '', category: 'procedure', content: '', author: savedName, tags: '' });

  const fetchKnowledge = useCallback(async () => {
    const res = await fetch('/api/knowledge');
    setEntries(await res.json());
  }, []);

  useDataRefetch('knowledge', fetchKnowledge);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content || !form.author) return;
    localStorage.setItem('noc-user', form.author);
    await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ ...form, title: '', content: '', tags: '' });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
  };

  const catMap = {
    procedure: { icon: '\u{1F4CB}', label: 'Procedure', badge: 'bg-indigo-500/10 text-indigo-400' },
    'known-fix': { icon: '\u{1F527}', label: 'Known Fix', badge: 'bg-green-500/10 text-green-500' },
    reference: { icon: '\u{1F4DD}', label: 'Reference', badge: 'bg-purple-500/10 text-purple-400' },
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

  const filtered = entries.filter(r => {
    if (filter !== 'all' && r.category !== filter) return false;
    const q = search.toLowerCase();
    if (q && !r.title.toLowerCase().includes(q) && !r.content.toLowerCase().includes(q) && !(r.tags || '').toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Knowledge Base</h1>
        <p className="text-sm text-text-muted mt-1">Procedures and past fixes — check here before troubleshooting</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input placeholder="Search knowledge base..." className="input md:max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {['all', 'procedure', 'known-fix', 'reference'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                filter === f ? 'bg-accent border-accent text-white' : 'bg-bg-card border-border text-text-secondary hover:border-accent hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : catMap[f]?.label || f}
            </button>
          ))}
        </div>
        <button className="btn btn-primary ml-auto" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Title" className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            <select className="input cursor-pointer" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="procedure">Procedure</option>
              <option value="known-fix">Known Fix</option>
              <option value="reference">Reference</option>
            </select>
            <input placeholder="Tags (comma separated)" className="input" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
          </div>
          <textarea placeholder="Steps, details, solution..." className="input min-h-[120px] mb-3" value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
          <div className="flex gap-3 items-center">
            <input placeholder="Your name" className="input w-48" value={form.author} onChange={e => setForm({...form, author: e.target.value})} required />
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No entries yet. Add procedures and known fixes, or resolve incidents to auto-populate.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(r => {
            const c = catMap[r.category] || catMap.procedure;
            const tags = r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            const isAuto = r.source === 'auto' || r.source === 'migrated';

            return (
              <div key={r.id} className={`card group ${isAuto ? 'border-green-500/20' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <div className="flex gap-2">
                    {isAuto && <span className="badge bg-green-500/10 text-green-400 text-[0.65rem]">Auto-saved</span>}
                    <span className={`badge ${c.badge}`}>{c.icon} {c.label}</span>
                  </div>
                </div>
                <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed mb-4">{r.content}</div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50 text-xs text-text-muted">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>By <strong className="text-text-primary">{r.author}</strong> &bull; {timeAgo(r.created_at)}</span>
                    {tags.length > 0 && (
                      <>
                        <span className="opacity-50">&bull;</span>
                        <div className="flex gap-1">{tags.map((t, i) => <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-white/60">{t}</span>)}</div>
                      </>
                    )}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
