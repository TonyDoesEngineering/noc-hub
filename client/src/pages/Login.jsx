import { useState } from 'react';
import { Zap } from 'lucide-react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (remember) {
      localStorage.setItem('noc-user', trimmed);
    } else {
      localStorage.removeItem('noc-user');
      sessionStorage.setItem('noc-user', trimmed);
    }
    onLogin(trimmed);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.4)] text-white mb-4">
            <Zap size={32} className="fill-current" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-accent-hover to-purple-400">
            NOC Hub
          </h1>
          <p className="text-text-muted text-sm mt-1">Team operations center</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            What's your name?
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            className="input mb-4 text-base py-3"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
          />
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-bg-input text-accent focus:ring-accent/30 cursor-pointer"
            />
            <span className="text-sm text-text-secondary">Remember me</span>
          </label>
          <button type="submit" className="btn btn-primary w-full py-3 text-base">
            Enter
          </button>
        </form>

        <p className="text-center text-text-muted text-xs mt-4">
          Your name is used for incidents, handoffs, and activity tracking.
        </p>
      </div>
    </div>
  );
}
