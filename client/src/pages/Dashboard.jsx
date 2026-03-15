import { useState, useCallback, useEffect } from 'react';
import { useDataRefetch } from '../lib/socket.jsx';
import { Activity, AlertTriangle, Radio, CheckCircle, User, Clock, Sun, Moon, Sunset } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [knowledge, setKnowledge] = useState([]);
  const [userName, setUserName] = useState(() => localStorage.getItem('noc-user') || '');

  useEffect(() => {
    if (userName) localStorage.setItem('noc-user', userName);
  }, [userName]);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch('/api/dashboard');
    setData(await res.json());
  }, []);

  const fetchKnowledge = useCallback(async () => {
    const res = await fetch('/api/knowledge');
    setKnowledge(await res.json());
  }, []);

  useDataRefetch('*', fetchDashboard);
  useDataRefetch('knowledge', fetchKnowledge);

  const handleClaim = async (id) => {
    const name = userName || prompt('Enter your name:');
    if (!name) return;
    if (!userName) setUserName(name);
    await fetch(`/api/incidents/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  };

  if (!data) return <div className="flex items-center justify-center h-64 text-text-muted">Loading dashboard...</div>;

  const p1Alerts = data.incidents.list.filter(i => i.severity === 'P1' && i.status === 'open');

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z'));
    const diff = Math.max(0, Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString();
  };

  const activityIcon = (type) => {
    const map = {
      incident_created: '\u{1F534}',
      incident_claimed: '\u{1F91A}',
      incident_resolved: '\u2705',
      vendor_offline: '\u{1F4E1}',
      vendor_online: '\u{1F7E2}',
      handoff: '\u{1F504}',
      knowledge_added: '\u{1F4DD}',
    };
    return map[type] || '\u2022';
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Live overview — everything auto-updates, no input needed</p>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} className="text-text-muted" />
          <input
            placeholder="Your name"
            className="input w-40 text-sm py-1.5"
            value={userName}
            onChange={e => setUserName(e.target.value)}
          />
        </div>
      </div>

      {/* Current Shift */}
      {data.shift && (
        <div className="card flex items-center justify-between mb-6 py-3 border-accent/30">
          <div className="flex items-center gap-3">
            {data.shift.name === 'Morning' ? <Sun size={20} className="text-yellow-400" /> :
             data.shift.name === 'Evening' ? <Sunset size={20} className="text-orange-400" /> :
             <Moon size={20} className="text-blue-400" />}
            <div>
              <span className="font-semibold text-text-primary">{data.shift.name} Shift</span>
              <span className="text-text-muted ml-2 text-sm">{data.shift.label}</span>
            </div>
          </div>
          <div className="text-sm text-text-muted">
            <span className="text-text-secondary font-medium">{data.shift.remaining}h</span> remaining
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Radio size={24} className="text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {data.vendors.online}<span className="text-text-muted text-base font-normal">/{data.vendors.total}</span>
            </div>
            <div className="text-sm text-text-muted">Vendors Online</div>
          </div>
          {data.vendors.offline > 0 && <span className="badge badge-red ml-auto">{data.vendors.offline} down</span>}
        </div>

        <div className="card flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.incidents.open > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            <AlertTriangle size={24} className={data.incidents.open > 0 ? 'text-red-500' : 'text-green-500'} />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.incidents.open}</div>
            <div className="text-sm text-text-muted">Open Incidents</div>
          </div>
          {data.incidents.p1 > 0 && <span className="badge badge-red ml-auto animate-pulse-red">{data.incidents.p1} P1</span>}
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle size={24} className="text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.incidents.resolvedToday}</div>
            <div className="text-sm text-text-muted">Resolved (24h)</div>
          </div>
        </div>
      </div>

      {/* P1 Alerts */}
      {p1Alerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {p1Alerts.map(alert => {
            const suggestion = knowledge.find(k =>
              (alert.affected && k.tags && k.tags.toLowerCase().includes(alert.affected.toLowerCase())) ||
              (alert.affected && k.title.toLowerCase().includes(alert.affected.toLowerCase()))
            );
            return (
              <div key={alert.id} className="card border-l-4 border-l-red-500 bg-red-500/5 animate-pulse-red">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-red">P1 ALERT</span>
                      <span className="font-bold text-red-100">{alert.title}</span>
                    </div>
                    <div className="text-sm text-red-200/80">{alert.description}</div>
                  </div>
                  <button
                    onClick={() => handleClaim(alert.id)}
                    className="btn bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 whitespace-nowrap shrink-0"
                  >
                    I'm on it
                  </button>
                </div>
                {suggestion && (
                  <div className="mt-3 bg-black/30 p-3 rounded-lg border border-red-500/20">
                    <div className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Suggested: {suggestion.title}</div>
                    <div className="text-sm text-text-secondary whitespace-pre-wrap">{suggestion.content}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Work + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Activity size={18} className="text-accent" /> Active Work
          </h2>
          {data.activeWork.length === 0 ? (
            <div className="card text-center text-text-muted py-8">All clear — no active investigations</div>
          ) : (
            <div className="space-y-3">
              {data.activeWork.map((w, i) => (
                <div key={i} className="card border-l-4 border-l-yellow-500 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{w.person}</span>
                      <span className="text-text-muted mx-2">&rarr;</span>
                      <span className="text-text-secondary">{w.task}</span>
                    </div>
                    <span className={`badge ${w.severity === 'P1' ? 'badge-red' : w.severity === 'P2' ? 'badge-orange' : 'badge-yellow'}`}>
                      {w.severity}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <Clock size={12} /> Since {timeAgo(w.since)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Clock size={18} className="text-accent" /> Live Feed
          </h2>
          {data.activity.length === 0 ? (
            <div className="card text-center text-text-muted py-8">No activity yet — events appear here automatically</div>
          ) : (
            <div className="card p-0 divide-y divide-border/50 max-h-[400px] overflow-y-auto">
              {data.activity.slice(0, 20).map((a, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                  <span className="text-lg mt-0.5">{activityIcon(a.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium text-text-primary">{a.actor}</span>
                      <span className="text-text-muted mx-1">&mdash;</span>
                      <span className="text-text-secondary">{a.summary}</span>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
