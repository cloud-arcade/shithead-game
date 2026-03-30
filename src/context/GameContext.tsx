/**
 * Game Context
 * Global state management for the game
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Game states
export type GameState = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover';

// Context state shape
interface GameContextState {
  gameState: GameState;
  score: number;
  highScore: number;
  lives: number;
  level: number;
  isPlatformConnected: boolean;
  userId: string | null;
  sessionId: string | null;
}

// Action types
type GameAction =
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'SET_SCORE'; payload: number }
  | { type: 'ADD_SCORE'; payload: number }
  | { type: 'SET_HIGH_SCORE'; payload: number }
  | { type: 'SET_LIVES'; payload: number }
  | { type: 'SET_LEVEL'; payload: number }
  | { type: 'SET_PLATFORM_CONNECTED'; payload: boolean }
  | { type: 'SET_USER_ID'; payload: string | null }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'RESET_GAME' };

// Initial state
const initialState: GameContextState = {
  gameState: 'loading',
  score: 0,
  highScore: 0,
  lives: 3,
  level: 1,
  isPlatformConnected: false,
  userId: null,
  sessionId: null,
};

// Reducer
function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_SCORE':
      return { 
        ...state, 
        score: action.payload,
        highScore: Math.max(state.highScore, action.payload),
      };
    case 'ADD_SCORE':
      const newScore = state.score + action.payload;
      return { 
        ...state, 
        score: newScore,
        highScore: Math.max(state.highScore, newScore),
      };
    case 'SET_HIGH_SCORE':
      return { ...state, highScore: action.payload };
    case 'SET_LIVES':
      return { ...state, lives: action.payload };
    case 'SET_LEVEL':
      return { ...state, level: action.payload };
    case 'SET_PLATFORM_CONNECTED':
      return { ...state, isPlatformConnected: action.payload };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'RESET_GAME':
      return { 
        ...initialState, 
        highScore: state.highScore,
        isPlatformConnected: state.isPlatformConnected,
        userId: state.userId,
        gameState: 'menu',
      };
    default:
      return state;
  }
}

// Context
const GameContext = createContext<{
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

// Hook
export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

// Convenience hooks
export function useGameState() {
  const { state } = useGameContext();
  return state.gameState;
}

export function useScore() {
  const { state } = useGameContext();
  return { score: state.score, highScore: state.highScore };
}
