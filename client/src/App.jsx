import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { SocketProvider } from './lib/socket.jsx';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import KnowledgeBase from './pages/KnowledgeBase';
import Vendors from './pages/Vendors';
import ShiftHandoff from './pages/ShiftHandoff';

function getUser() {
  const name = localStorage.getItem('noc-user');
  if (!name) return null;

  const persist = localStorage.getItem('noc-persist');
  if (persist === 'forever') {
    sessionStorage.setItem('noc-active', '1');
    return name;
  }

  // Session mode: check if this is the same browser session
  if (sessionStorage.getItem('noc-active')) {
    return name;
  }

  // New browser session without "remember me" — clear and show login
  localStorage.removeItem('noc-user');
  localStorage.removeItem('noc-persist');
  return null;
}

function App() {
  const [user, setUser] = useState(getUser);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('noc-user');
    localStorage.removeItem('noc-persist');
    sessionStorage.removeItem('noc-active');
    setUser(null);
  };

  return (
    <SocketProvider>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/handoff" element={<ShiftHandoff />} />
        </Routes>
      </Layout>
    </SocketProvider>
  );
}

export default App;
