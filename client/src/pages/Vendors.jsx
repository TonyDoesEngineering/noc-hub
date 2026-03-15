import { useState, useCallback } from 'react';
import { useDataRefetch } from '../lib/socket.jsx';

export default function Vendors() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', ip: '', port: '2775', status: 'online', latency: '', dlr_rate: '', notes: '' });

  const fetchVendors = useCallback(async () => {
    const res = await fetch('/api/vendors');
    setEntries(await res.json());
  }, []);

  useDataRefetch('vendors', fetchVendors);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    await fetch('/api/vendors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ name: '', ip: '', port: '2775', status: 'online', latency: '', dlr_rate: '', notes: '' });
    setShowForm(false);
  };

  const handleStatusChange = async (id, status) => {
    const v = entries.find(x => x.id === id);
    if (!v) return;
    await fetch(`/api/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, status })
    });
  };

  const handleDelete = async (id) => {
    await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
  };

  const statusMap = {
    online: { label: 'Online', badge: 'badge-green', border: 'border-l-green-500', dot: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' },
    degraded: { label: 'Degraded', badge: 'badge-yellow', border: 'border-l-yellow-500', dot: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' },
    offline: { label: 'Offline', badge: 'badge-red', border: 'border-l-red-500', dot: 'bg-red-500 animate-pulse-red' }
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr + 'Z');
    const diff = (Math.max(0, Date.now() - d.getTime())) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString();
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">Vendor Monitor</h1>
          <p className="text-sm text-text-muted mt-1">Vendor connection status at a glance</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <input placeholder="Vendor name" className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input placeholder="IP address" className="input" value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} />
            <input placeholder="Port (default 2775)" className="input" value={form.port} onChange={e => setForm({...form, port: e.target.value})} />
            <select className="input cursor-pointer" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="online">🟢 Online</option>
              <option value="degraded">🟡 Degraded</option>
              <option value="offline">🔴 Offline</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input placeholder="Latency (ms)" className="input" value={form.latency} onChange={e => setForm({...form, latency: e.target.value})} />
            <input placeholder="DLR Rate (%)" className="input" value={form.dlr_rate} onChange={e => setForm({...form, dlr_rate: e.target.value})} />
          </div>
          <textarea placeholder="Notes" className="input min-h-[60px] mb-4" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <button type="submit" className="btn btn-primary w-full md:w-auto">Save Vendor</button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No vendors added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {entries.map(v => {
            const s = statusMap[v.status] || statusMap.online;
            return (
              <div key={v.id} className={`card border-l-4 ${s.border} relative group`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></span>
                    <span className="font-semibold text-lg">{v.name}</span>
                  </div>
                  <span className={`badge ${s.badge}`}>{s.label}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[0.8rem] text-text-secondary bg-black/20 p-2 rounded-lg mb-3">
                  <div>IP: <span className="font-medium text-text-primary">{v.ip || '-'}</span></div>
                  <div>Port: <span className="font-medium text-text-primary">{v.port || '-'}</span></div>
                  <div>Lat: <span className="font-medium text-text-primary">{v.latency || '-'}</span></div>
                  <div>DLR: <span className="font-medium text-text-primary">{v.dlr_rate ? v.dlr_rate+'%' : '-'}</span></div>
                </div>

                {v.notes && <div className="text-sm text-text-secondary mb-3 bg-white/5 p-2 rounded border border-white/5">{v.notes}</div>}

                <div className="flex justify-between items-center mt-auto border-t border-border/50 pt-2">
                  <span className="text-xs text-text-muted">{timeAgo(v.last_checked)}</span>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStatusChange(v.id, 'online')} className="hover:scale-110 px-1" title="Set Online">🟢</button>
                    <button onClick={() => handleStatusChange(v.id, 'degraded')} className="hover:scale-110 px-1" title="Set Degraded">🟡</button>
                    <button onClick={() => handleStatusChange(v.id, 'offline')} className="hover:scale-110 px-1" title="Set Offline">🔴</button>
                    <button onClick={() => handleDelete(v.id)} className="text-xs text-red-500 hover:text-red-400 ml-1">🗑️</button>
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
