/**
 * CloudArcade Platform Integration Hook
 * Handles communication with the parent CloudArcade platform
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGameContext } from '../context/GameContext';

interface CloudArcadeOptions {
  debug?: boolean;
}

interface UserInfo {
  userId?: string;
  guestId?: string;
  guestName?: string;
  gameId: string;
}

interface Session {
  id: string;
  gameId: string;
  userId?: string;
  guestId?: string;
  startedAt: string;
  endedAt?: string;
}

interface ScorePayload {
  score: number;
  metadata?: Record<string, unknown>;
  checksum?: string;
}

// Message types
type GameToParentMessage =
  | { type: 'GAME_READY' }
  | { type: 'START_SESSION'; payload?: { metadata?: Record<string, unknown> } }
  | { type: 'END_SESSION'; payload?: { metadata?: Record<string, unknown> } }
  | { type: 'SUBMIT_SCORE'; payload: ScorePayload }
  | { type: 'GAME_OVER'; payload?: { score?: number; endSession?: boolean; metadata?: Record<string, unknown> } }
  | { type: 'GAME_ERROR'; payload: string };

type ParentToGameMessage =
  | { type: 'USER_INFO'; payload: UserInfo }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string; session: Session } }
  | { type: 'SESSION_ENDED'; payload: { session: Session } }
  | { type: 'SCORE_SUBMITTED'; payload: { score: object; rank?: number } }
  | { type: 'SCORE_ERROR'; payload: { error: string } };

export function useCloudArcade(options: CloudArcadeOptions = {}) {
  const { debug = false } = options;
  const { dispatch } = useGameContext();
  const sessionIdRef = useRef<string | null>(null);

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[CloudArcade]', ...args);
    }
  }, [debug]);

  // Send message to parent
  const sendMessage = useCallback((message: GameToParentMessage) => {
    log('Sending:', message);
    window.parent.postMessage(message, '*');
  }, [log]);

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as ParentToGameMessage;
      if (!data || typeof data !== 'object' || !('type' in data)) return;

      log('Received:', data);

      switch (data.type) {
        case 'USER_INFO':
          dispatch({ type: 'SET_PLATFORM_CONNECTED', payload: true });
          dispatch({ type: 'SET_USER_ID', payload: data.payload.userId || data.payload.guestId || null });
          dispatch({ type: 'SET_STATE', payload: 'menu' });
          break;

        case 'SESSION_STARTED':
          sessionIdRef.current = data.payload.sessionId;
          dispatch({ type: 'SET_SESSION_ID', payload: data.payload.sessionId });
          break;

        case 'SESSION_ENDED':
          sessionIdRef.current = null;
          dispatch({ type: 'SET_SESSION_ID', payload: null });
          break;

        case 'SCORE_SUBMITTED':
          log('Score submitted, rank:', data.payload.rank);
          break;

        case 'SCORE_ERROR':
          console.error('Score error:', data.payload.error);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Send GAME_READY on mount
    sendMessage({ type: 'GAME_READY' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [dispatch, log, sendMessage]);

  // Public API
  const startSession = useCallback((metadata?: Record<string, unknown>) => {
    sendMessage({ type: 'START_SESSION', payload: metadata ? { metadata } : undefined });
  }, [sendMessage]);

  const endSession = useCallback((metadata?: Record<string, unknown>) => {
    sendMessage({ type: 'END_SESSION', payload: metadata ? { metadata } : undefined });
  }, [sendMessage]);

  const submitScore = useCallback((score: number, metadata?: Record<string, unknown>) => {
    sendMessage({ type: 'SUBMIT_SCORE', payload: { score, metadata } });
  }, [sendMessage]);

  const gameOver = useCallback((score?: number, endSession = true, metadata?: Record<string, unknown>) => {
    sendMessage({ type: 'GAME_OVER', payload: { score, endSession, metadata } });
  }, [sendMessage]);

  const reportError = useCallback((message: string) => {
    sendMessage({ type: 'GAME_ERROR', payload: message });
  }, [sendMessage]);

  return {
    startSession,
    endSession,
    submitScore,
    gameOver,
    reportError,
  };
}
