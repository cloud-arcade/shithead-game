/**
 * CloudArcade Platform Integration Layer
 * Handles all communication between the game and the CloudArcade parent platform
 */

import type {
  GameToParentMessage,
  ParentToGameMessage,
  UserInfo,
  Session,
  Score,
  CloudArcadeEvents,
  CloudArcadeEventType,
} from '@/types';

type EventCallback<T extends CloudArcadeEventType> = CloudArcadeEvents[T];

export class CloudArcade {
  private static instance: CloudArcade | null = null;

  // Platform connection state
  private _isConnected: boolean = false;
  private _userId: string | null = null;
  private _guestId: string | null = null;
  private _guestName: string | null = null;
  private _gameId: string | null = null;
  private _sessionId: string | null = null;

  // Event listeners
  private eventListeners: Map<CloudArcadeEventType, Set<EventCallback<CloudArcadeEventType>>> =
    new Map();

  // Message listener reference for cleanup
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  // Debug mode
  private debug: boolean = false;

  private constructor() {
    this.setupMessageListener();
  }

  /**
   * Get singleton instance of CloudArcade
   */
  public static getInstance(): CloudArcade {
    if (!CloudArcade.instance) {
      CloudArcade.instance = new CloudArcade();
    }
    return CloudArcade.instance;
  }

  /**
   * Initialize the platform connection
   * Sends GAME_READY and waits for USER_INFO
   */
  public init(options?: { debug?: boolean }): void {
    this.debug = options?.debug ?? false;
    this.log('Initializing CloudArcade integration...');
    this.sendMessage({ type: 'GAME_READY' });
  }

  /**
   * Enable or disable debug logging
   */
  public setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  // ============================================
  // Public Getters
  // ============================================

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public get userId(): string | null {
    return this._userId;
  }

  public get guestId(): string | null {
    return this._guestId;
  }

  public get guestName(): string | null {
    return this._guestName;
  }

  public get gameId(): string | null {
    return this._gameId;
  }

  public get sessionId(): string | null {
    return this._sessionId;
  }

  public get isAuthenticated(): boolean {
    return this._userId !== null;
  }

  public get isGuest(): boolean {
    return this._guestId !== null && this._userId === null;
  }

  // ============================================
  // Platform Communication Methods
  // ============================================

  /**
   * Start a new game session
   * @param metadata Optional metadata to include with the session
   */
  public startSession(metadata?: Record<string, unknown>): void {
    this.log('Starting session...', metadata);
    this.sendMessage({
      type: 'START_SESSION',
      payload: metadata ? { metadata } : undefined,
    });
  }

  /**
   * End the current game session
   * @param metadata Optional metadata to include when ending
   */
  public endSession(metadata?: Record<string, unknown>): void {
    this.log('Ending session...', metadata);
    this.sendMessage({
      type: 'END_SESSION',
      payload: metadata ? { metadata } : undefined,
    });
  }

  /**
   * Submit a score to the leaderboard
   * @param score The score value
   * @param metadata Optional metadata (level, time, etc.)
   * @param includeChecksum Whether to include a checksum for validation
   */
  public submitScore(
    score: number,
    metadata?: Record<string, unknown>,
    includeChecksum: boolean = false
  ): void {
    this.log('Submitting score:', score, metadata);

    const payload: {
      score: number;
      metadata?: Record<string, unknown>;
      checksum?: string;
    } = { score };

    if (metadata) {
      payload.metadata = metadata;
    }

    if (includeChecksum) {
      payload.checksum = this.generateChecksum(score, metadata);
    }

    this.sendMessage({
      type: 'SUBMIT_SCORE',
      payload,
    });
  }

  /**
   * Signal game over
   * @param score Optional final score (will auto-submit if provided)
   * @param shouldEndSession Whether to also end the session
   * @param metadata Optional metadata
   */
  public gameOver(
    score?: number,
    shouldEndSession: boolean = true,
    metadata?: Record<string, unknown>
  ): void {
    this.log('Game over:', { score, shouldEndSession, metadata });
    this.sendMessage({
      type: 'GAME_OVER',
      payload: {
        score,
        endSession: shouldEndSession,
        metadata,
      },
    });
  }

  /**
   * Report an error to the platform
   * @param message Error message
   */
  public reportError(message: string): void {
    this.log('Reporting error:', message);
    this.sendMessage({
      type: 'GAME_ERROR',
      payload: message,
    });
  }

  // ============================================
  // Event Subscription
  // ============================================

  /**
   * Subscribe to platform events
   * @param event Event type to subscribe to
   * @param callback Callback function
   */
  public on<T extends CloudArcadeEventType>(event: T, callback: CloudArcadeEvents[T]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as EventCallback<CloudArcadeEventType>);
  }

  /**
   * Unsubscribe from platform events
   * @param event Event type to unsubscribe from
   * @param callback Callback function to remove
   */
  public off<T extends CloudArcadeEventType>(event: T, callback: CloudArcadeEvents[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback as EventCallback<CloudArcadeEventType>);
    }
  }

  /**
   * Subscribe to an event once
   * @param event Event type
   * @param callback Callback function (will be removed after first call)
   */
  public once<T extends CloudArcadeEventType>(event: T, callback: CloudArcadeEvents[T]): void {
    const wrapper = ((...args: Parameters<CloudArcadeEvents[T]>) => {
      this.off(event, wrapper as CloudArcadeEvents[T]);
      (callback as (...args: Parameters<CloudArcadeEvents[T]>) => void)(...args);
    }) as CloudArcadeEvents[T];
    this.on(event, wrapper);
  }

  // ============================================
  // Private Methods
  // ============================================

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // In production, you might want to validate event.origin
      this.handleMessage(event.data);
    };
    window.addEventListener('message', this.messageHandler);
  }

  private handleMessage(data: unknown): void {
    // Validate message structure
    if (!data || typeof data !== 'object' || !('type' in data)) {
      return;
    }

    const message = data as ParentToGameMessage;
    this.log('Received message:', message);

    switch (message.type) {
      case 'USER_INFO':
        this.handleUserInfo(message.payload);
        break;
      case 'SESSION_STARTED':
        this.handleSessionStarted(message.payload.sessionId, message.payload.session);
        break;
      case 'SESSION_ENDED':
        this.handleSessionEnded(message.payload.session);
        break;
      case 'SCORE_SUBMITTED':
        this.handleScoreSubmitted(message.payload.score, message.payload.rank);
        break;
      case 'SCORE_ERROR':
        this.handleScoreError(message.payload.error);
        break;
    }
  }

  private handleUserInfo(info: UserInfo): void {
    this._isConnected = true;
    this._userId = info.userId ?? null;
    this._guestId = info.guestId ?? null;
    this._guestName = info.guestName ?? null;
    this._gameId = info.gameId;
    this.emit('userInfo', info);
  }

  private handleSessionStarted(sessionId: string, session: Session): void {
    this._sessionId = sessionId;
    this.emit('sessionStarted', sessionId, session);
  }

  private handleSessionEnded(session: Session): void {
    this._sessionId = null;
    this.emit('sessionEnded', session);
  }

  private handleScoreSubmitted(score: Score, rank?: number): void {
    this.emit('scoreSubmitted', score, rank);
  }

  private handleScoreError(error: string): void {
    this.emit('scoreError', error);
  }

  private emit<T extends CloudArcadeEventType>(
    event: T,
    ...args: Parameters<CloudArcadeEvents[T]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          (callback as (...args: Parameters<CloudArcadeEvents[T]>) => void)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  private sendMessage(message: GameToParentMessage): void {
    this.log('Sending message:', message);
    window.parent.postMessage(message, '*');
  }

  /**
   * Generate a simple checksum for score validation
   * Note: This is a basic implementation. For production, use a more secure method.
   */
  private generateChecksum(score: number, metadata?: Record<string, unknown>): string {
    const data = JSON.stringify({ score, metadata, timestamp: Date.now() });
    // Simple hash - replace with proper HMAC in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[CloudArcade]', ...args);
    }
  }

  /**
   * Cleanup - call when game is being destroyed
   */
  public destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.eventListeners.clear();
    CloudArcade.instance = null;
  }
}

// Export singleton instance for convenience
export const cloudArcade = CloudArcade.getInstance();
