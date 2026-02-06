import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface WebSocketContextValue {
  isConnected: boolean;
  sendMessage: (message: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // TODO: WebSocket connection logic will be implemented when WebSocket endpoint is available
    // For now, this is a placeholder implementation
    // Example:
    // const socket = new WebSocket('wss://your-websocket-url');
    // socket.onopen = () => setIsConnected(true);
    // socket.onclose = () => setIsConnected(false);
    // wsRef.current = socket;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const value: WebSocketContextValue = {
    isConnected,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
