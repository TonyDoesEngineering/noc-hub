import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`animate-fade-in flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
              t.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' :
              t.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' :
              'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {t.message}
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-2 opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
