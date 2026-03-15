import { io } from 'socket.io-client';
import { createContext, useContext, useEffect, useState } from 'react';

// Connect to the proxy in dev, or same origin in prod
export const socket = io(window.location.origin, { path: '/socket.io' });

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

// Custom hook to trigger refetches when db changes
export const useDataRefetch = (topic, fetchDataFn) => {
  const socket = useSocket();

  useEffect(() => {
    fetchDataFn(); // Initial fetch
    
    const handleUpdate = (updatedTopic) => {
      if (topic === '*' || updatedTopic === topic || updatedTopic === 'all') {
        fetchDataFn();
      }
    };
    
    socket.on('data_updated', handleUpdate);
    return () => socket.off('data_updated', handleUpdate);
  }, [topic, socket, fetchDataFn]);
};
