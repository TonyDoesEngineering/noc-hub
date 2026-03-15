import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { SocketProvider } from './lib/socket.jsx';

import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import KnowledgeBase from './pages/KnowledgeBase';
import Vendors from './pages/Vendors';
import ShiftHandoff from './pages/ShiftHandoff';

function App() {
  return (
    <SocketProvider>
      <Layout>
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
