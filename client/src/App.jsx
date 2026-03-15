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

function App() {
  const [user, setUser] = useState(() =>
    localStorage.getItem('noc-user') || sessionStorage.getItem('noc-user') || null
  );

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('noc-user');
    sessionStorage.removeItem('noc-user');
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
