import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '../utils/constants';

export interface WSMessage {
  type: string;
  status?: string;
  job_id?: string;
  progress?: number;
  current_step?: string;
  result_url?: string;
  message?: string;
  [key: string]: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const stopPing = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    const startPing = () => {
      stopPing();
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000); // 15s heartbeat ping
    };

    const connect = () => {
      try {
        if (
          wsRef.current &&
          (wsRef.current.readyState === WebSocket.CONNECTING ||
            wsRef.current.readyState === WebSocket.OPEN)
        ) {
          return;
        }

        const ws = new WebSocket(WS_BASE_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            reconnectAttemptsRef.current = 0;
            startPing();
            setLastMessage({
              type: 'connection',
              status: 'connected',
              message: 'Connected to AuraEdit AI Gateway',
            });
          }
        };

        ws.onmessage = (event) => {
          if (isMounted) {
            try {
              const data: WSMessage = JSON.parse(event.data);
              if (data.type !== 'pong') {
                setLastMessage(data);
              }
            } catch (e) {
              console.error('[WS Parse Error]', e);
            }
          }
        };

        ws.onclose = () => {
          stopPing();
          if (isMounted) {
            setIsConnected(false);
            const attempts = reconnectAttemptsRef.current;
            const delay = Math.min(1000 * Math.pow(2, attempts), 10000); // 1s, 2s, 4s, 8s, 10s max
            reconnectAttemptsRef.current += 1;

            setLastMessage({
              type: 'connection_reconnecting',
              status: 'reconnecting',
              message: `Connection dropped. Reconnecting in ${Math.round(delay / 1000)}s...`,
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                connect();
              }
            }, delay);
          }
        };

        ws.onerror = (err) => {
          if (isMounted) {
            console.warn('[WS Network Warning] Socket disconnect or error:', err);
          }
        };
      } catch (e) {
        if (isMounted) {
          console.warn('[WS Init Exception]', e);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      stopPing();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;

        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            ws.close();
          };
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        wsRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WS Send Warning] Connection not open. Socket state:', wsRef.current?.readyState);
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}


