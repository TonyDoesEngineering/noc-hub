import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, AlertTriangle, RadioTower, RefreshCw, Zap } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { path: '/knowledge', label: 'Knowledge', icon: BookOpen },
    { path: '/vendors', label: 'Vendors', icon: RadioTower },
    { path: '/handoff', label: 'Handoff', icon: RefreshCw },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <aside className="w-[220px] bg-bg-secondary border-r border-border flex flex-col shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] text-white">
            <Zap size={20} className="fill-current" />
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-br from-accent-hover to-purple-400">
            NOC Hub
          </span>
        </div>
        
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {links.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-[0.93rem] font-medium transition-all ${
                  isActive 
                    ? 'bg-gradient-to-br from-accent/15 to-purple-500/10 text-accent-hover shadow-[inset_3px_0_0_#6366f1]'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border text-center">
          <p className="text-[0.85rem] font-mono text-text-muted">
            {time.toLocaleString('en-GB', { 
              weekday: 'short', day: '2-digit', month: 'short', 
              hour: '2-digit', minute: '2-digit', second: '2-digit' 
            })}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {children}
      </main>
    </div>
  );
}
