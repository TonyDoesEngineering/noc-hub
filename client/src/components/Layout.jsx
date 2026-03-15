import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, AlertTriangle, RadioTower, RefreshCw, Zap, LogOut, Menu, X } from 'lucide-react';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { path: '/knowledge', label: 'Knowledge', icon: BookOpen },
    { path: '/vendors', label: 'Vendors', icon: RadioTower },
    { path: '/handoff', label: 'Handoff', icon: RefreshCw },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] bg-bg-secondary border-r border-border flex-col shrink-0">
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

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-primary font-medium truncate">{user}</span>
            <button onClick={onLogout} className="text-text-muted hover:text-red-400 transition-colors" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
          <p className="text-[0.8rem] font-mono text-text-muted text-center">
            {time.toLocaleString('en-GB', { 
              weekday: 'short', day: '2-digit', month: 'short', 
              hour: '2-digit', minute: '2-digit', second: '2-digit' 
            })}
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 md:hidden bg-bg-secondary border-b border-border flex items-center justify-between px-4 h-14 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white">
            <Zap size={14} className="fill-current" />
          </div>
          <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-br from-accent-hover to-purple-400">
            NOC Hub
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-mono">
            {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-text-secondary p-1">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="fixed top-14 left-0 right-0 md:hidden bg-bg-secondary border-b border-border z-40 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm text-text-primary">{user}</span>
            <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-300">Sign out</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0 p-4 md:p-8 relative">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-secondary border-t border-border flex justify-around items-center h-16 z-50">
        {links.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-all ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <Icon size={20} />
              <span className="text-[0.6rem] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
