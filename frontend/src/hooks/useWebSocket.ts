'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useQuantumStore } from '@/store/quantumStore';
import type { WSMessage } from '@/types/quantum';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(1000);
  const mountedRef = useRef(true);

  const {
    sessionId,
    setWsConnected,
    setSimulationProgress,
    setSimulationResult,
    setSimulationError,
    setSimulationRunning,
    setEvolutionStep,
  } = useQuantumStore();

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'simulation_update': {
          const p = msg.payload as Record<string, unknown>;
          const stage = p.stage as string;
          const progress = p.progress as number;

          if (stage === 'complete') {
            setSimulationResult(p as never);
          } else if (stage === 'error') {
            setSimulationError(p.error as string);
          } else {
            setSimulationProgress(progress, stage);
          }
          break;
        }

        case 'statevector_update': {
          const p = msg.payload as Record<string, unknown>;
          setEvolutionStep(p as never);
          break;
        }

        case 'transpile_result': {
          // handled externally via promise
          break;
        }

        case 'error': {
          const p = msg.payload as Record<string, unknown>;
          setSimulationError((p.message ?? 'Unknown error') as string);
          break;
        }

        case 'pong':
          break;
      }
    } catch (err) {
      console.error('[WS] Message parse error', err);
    }
  }, [setSimulationProgress, setSimulationResult, setSimulationError, setSimulationRunning, setEvolutionStep]);

  const handleMessageRef = useRef(handleMessage);
  handleMessageRef.current = handleMessage;

  const connectRef = useRef<() => void>();

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(`${WS_URL}/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setWsConnected(true);
      reconnectDelay.current = 1000;
    };

    ws.onmessage = (e) => handleMessageRef.current(e);

    ws.onclose = () => {
      setWsConnected(false);
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000);
          connectRef.current?.();
        }, reconnectDelay.current);
      }
    };

    ws.onerror = () => { ws.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, setWsConnected]);

  connectRef.current = connect;

  useEffect(() => {
    mountedRef.current = true;
    connect();
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(pingInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  const simulate = useCallback((payload: Record<string, unknown>) => {
    setSimulationRunning(true);
    return send({ type: 'simulate', payload });
  }, [send, setSimulationRunning]);

  const startEvolution = useCallback((payload: Record<string, unknown>) => {
    setSimulationRunning(true);
    return send({ type: 'statevector_evolution', payload });
  }, [send, setSimulationRunning]);

  const transpile = useCallback((payload: Record<string, unknown>) => {
    return send({ type: 'transpile', payload });
  }, [send]);

  const validate = useCallback((payload: Record<string, unknown>) => {
    return send({ type: 'validate', payload });
  }, [send]);

  return { send, simulate, startEvolution, transpile, validate };
}
