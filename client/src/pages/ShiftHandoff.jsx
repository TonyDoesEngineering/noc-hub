import { useState, useCallback, useEffect } from 'react';
import { useDataRefetch } from '../lib/socket.jsx';

export default function ShiftHandoff() {
  const [entries, setEntries] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(() => localStorage.getItem('noc-user') || '');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fetchHandoffs = useCallback(async () => {
    const res = await fetch('/api/handoffs');
    setEntries(await res.json());
  }, []);

  useDataRefetch('handoffs', fetchHandoffs);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handoffs/generate');
      setGenerated(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { generateSummary(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName) return;
    localStorage.setItem('noc-user', userName);
    await fetch('/api/handoffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_by: userName,
        shift_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        summary: generated?.summary || '',
        notes,
      }),
    });
    setSubmitted(true);
    setNotes('');
  };

  const handleDelete = async (id) => {
    await fetch(`/api/handoffs/${id}`, { method: 'DELETE' });
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

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Shift Handoff</h1>
        <p className="text-sm text-text-muted mt-1">Auto-generated summary — review, add notes if needed, submit</p>
      </div>

      {submitted ? (
        <div className="card border-l-4 border-l-green-500 bg-green-500/5 mb-8 text-center py-8">
          <div className="text-2xl mb-2">{'\u2705'}</div>
          <div className="text-lg font-semibold text-green-400">Handoff Submitted</div>
          <div className="text-sm text-text-muted mt-1">The next shift can see your summary below</div>
          <button onClick={() => { setSubmitted(false); generateSummary(); }} className="btn btn-ghost mt-4 text-sm">Create Another</button>
        </div>
      ) : (
        <div className="card border-l-4 border-l-accent mb-8 shadow-lg">
          {loading ? (
            <div className="text-center py-8 text-text-muted">Generating shift summary...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Auto-Generated Summary</div>
                <pre className="bg-black/30 rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed border border-border/50">
                  {generated?.summary || 'No data for this shift period.'}
                </pre>
                <button type="button" onClick={generateSummary} className="text-xs text-accent hover:underline mt-2">Refresh summary</button>
              </div>

              {generated?.shift && (
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <span className="badge badge-purple">{generated.shift.name} Shift</span>
                  <span className="text-text-muted">{generated.shift.label}</span>
                  <span className="text-text-muted">&bull; {generated.shift.elapsed}h elapsed</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input placeholder="Your name" className="input" value={userName} onChange={e => setUserName(e.target.value)} required />
                <div className="input bg-bg-card/50 flex items-center text-text-muted text-sm cursor-default">
                  Handing off at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <textarea
                placeholder="Anything else the next shift should know? (optional)"
                className="input min-h-[80px] mb-4"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <button type="submit" className="btn btn-primary w-full sm:w-auto px-8">Submit Handoff</button>
            </form>
          )}
        </div>
      )}

      <h2 className="text-lg font-bold mb-4 text-text-secondary border-b border-border pb-2">Previous Handoffs</h2>

      {entries.length === 0 ? (
        <div className="text-center py-10 text-text-muted">No handoffs yet.</div>
      ) : (
        <div className="flex flex-col gap-5">
          {entries.map(h => (
            <div key={h.id} className="card relative group bg-bg-primary/50">
              <div className="flex justify-between items-center mb-3 border-b border-border/50 pb-3">
                <div className="font-semibold text-lg text-white">
                  {h.shift_by}
                  {h.shift_time && <span className="text-text-muted text-sm ml-2 font-normal py-1 px-2 bg-text-muted/10 rounded-md">{h.shift_time}</span>}
                </div>
                <div className="text-sm text-text-muted">{timeAgo(h.created_at)}</div>
              </div>

              {/* New format: auto-generated summary + optional notes */}
              {h.summary && (
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed mb-3">{h.summary}</pre>
              )}
              {h.notes && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Notes</div>
                  <div className="text-sm text-text-secondary whitespace-pre-wrap">{h.notes}</div>
                </div>
              )}

              {/* Legacy format: old handoffs with separate fields */}
              {!h.summary && (
                <div className="space-y-3">
                  {h.active_issues && <div><div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Active Issues</div><div className="text-sm text-text-secondary whitespace-pre-wrap">{h.active_issues}</div></div>}
                  {h.resolved && <div><div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Resolved</div><div className="text-sm text-text-secondary whitespace-pre-wrap">{h.resolved}</div></div>}
                  {(h.alarms || h.vendor_status) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 p-3 rounded-lg">
                      {h.alarms && <div><div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">Alarms</div><div className="text-sm text-text-muted whitespace-pre-wrap">{h.alarms}</div></div>}
                      {h.vendor_status && <div><div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Vendors</div><div className="text-sm text-text-muted whitespace-pre-wrap">{h.vendor_status}</div></div>}
                    </div>
                  )}
                  {h.notes_next && <div><div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Notes</div><div className="text-sm text-text-secondary whitespace-pre-wrap">{h.notes_next}</div></div>}
                </div>
              )}

              <button
                onClick={() => handleDelete(h.id)}
                className="absolute top-4 right-4 text-xs text-red-500 opacity-0 group-hover:opacity-100 bg-bg-card border border-red-500/20 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-all"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
