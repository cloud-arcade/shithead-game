/**
 * CloudArcade Platform Type Definitions
 * Types for postMessage communication between game and parent platform
 */

// ============================================
// Message Types - Game to Parent
// ============================================

export type GameToParentMessageType =
  | 'GAME_READY'
  | 'START_SESSION'
  | 'END_SESSION'
  | 'SUBMIT_SCORE'
  | 'GAME_OVER'
  | 'GAME_ERROR';

export interface GameReadyMessage {
  type: 'GAME_READY';
  payload?: undefined;
}

export interface StartSessionMessage {
  type: 'START_SESSION';
  payload?: {
    metadata?: Record<string, unknown>;
  };
}

export interface EndSessionMessage {
  type: 'END_SESSION';
  payload?: {
    metadata?: Record<string, unknown>;
  };
}

export interface SubmitScoreMessage {
  type: 'SUBMIT_SCORE';
  payload: {
    score: number;
    metadata?: Record<string, unknown>;
    checksum?: string;
  };
}

export interface GameOverMessage {
  type: 'GAME_OVER';
  payload?: {
    score?: number;
    endSession?: boolean;
    metadata?: Record<string, unknown>;
  };
}

export interface GameErrorMessage {
  type: 'GAME_ERROR';
  payload: string;
}

export type GameToParentMessage =
  | GameReadyMessage
  | StartSessionMessage
  | EndSessionMessage
  | SubmitScoreMessage
  | GameOverMessage
  | GameErrorMessage;

// ============================================
// Message Types - Parent to Game
// ============================================

export type ParentToGameMessageType =
  | 'USER_INFO'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SCORE_SUBMITTED'
  | 'SCORE_ERROR';

export interface UserInfo {
  userId?: string;
  guestId?: string;
  guestName?: string;
  gameId: string;
}

export interface UserInfoMessage {
  type: 'USER_INFO';
  payload: UserInfo;
}

export interface Session {
  id: string;
  gameId: string;
  userId?: string;
  guestId?: string;
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionStartedMessage {
  type: 'SESSION_STARTED';
  payload: {
    sessionId: string;
    session: Session;
  };
}

export interface SessionEndedMessage {
  type: 'SESSION_ENDED';
  payload: {
    session: Session;
  };
}

export interface Score {
  id: string;
  gameId: string;
  userId?: string;
  guestId?: string;
  score: number;
  submittedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ScoreSubmittedMessage {
  type: 'SCORE_SUBMITTED';
  payload: {
    score: Score;
    rank?: number;
  };
}

export interface ScoreErrorMessage {
  type: 'SCORE_ERROR';
  payload: {
    error: string;
  };
}

export type ParentToGameMessage =
  | UserInfoMessage
  | SessionStartedMessage
  | SessionEndedMessage
  | ScoreSubmittedMessage
  | ScoreErrorMessage;

// ============================================
// Event Types for Game Subscription
// ============================================

export interface CloudArcadeEvents {
  userInfo: (info: UserInfo) => void;
  sessionStarted: (sessionId: string, session: Session) => void;
  sessionEnded: (session: Session) => void;
  scoreSubmitted: (score: Score, rank?: number) => void;
  scoreError: (error: string) => void;
}

export type CloudArcadeEventType = keyof CloudArcadeEvents;

// ============================================
// Game State Types
// ============================================

export enum GameState {
  LOADING = 'LOADING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export interface GameConfig {
  /** Canvas element ID */
  canvasId: string;
  /** Target frames per second */
  targetFps?: number;
  /** Enable debug mode */
  debug?: boolean;
  /** Initial game state */
  initialState?: GameState;
}

// ============================================
// Canvas & Rendering Types
// ============================================

export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Input Types
// ============================================

export interface InputState {
  keys: Set<string>;
  mouse: {
    position: Position;
    buttons: Set<number>;
  };
  touch: {
    active: boolean;
    positions: Position[];
  };
}

export enum InputDevice {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  TOUCH = 'touch',
  GAMEPAD = 'gamepad',
}

// ============================================
// Asset Types
// ============================================

export interface AssetManifest {
  images?: AssetEntry[];
  audio?: AssetEntry[];
  fonts?: AssetEntry[];
  data?: AssetEntry[];
}

export interface AssetEntry {
  key: string;
  src: string;
  /** Optional: for sprite sheets */
  frameWidth?: number;
  frameHeight?: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentAsset?: string;
}
