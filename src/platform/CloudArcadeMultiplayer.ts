/**
 * CloudArcade Multiplayer Platform Integration Layer
 *
 * Standalone (non-React) class for vanilla JS / Canvas games.
 * For React games, prefer the `useMultiplayer` hook which does the same
 * thing but keeps state inside React context.
 *
 * Usage:
 *   import { cloudArcadeMultiplayer } from '@/platform';
 *   cloudArcadeMultiplayer.init({ debug: true });
 *   cloudArcadeMultiplayer.on('gameStarted', (payload) => { ... });
 *   cloudArcadeMultiplayer.sendAction('PLACE_PIECE', { x: 3, y: 5 });
 */

import type {
  MultiplayerOutgoingMessage,
  MultiplayerIncomingMessage,
  MultiplayerEvents,
  MultiplayerEventType,
} from '@/types';

type EventCallback<T extends MultiplayerEventType> = MultiplayerEvents[T];

// Message types the *game* sends TO the parent — must never be dispatched locally.
const OUTGOING_TYPES = new Set([
  'MP_SEND_ACTION',
  'MP_SET_STATE',
  'MP_END_TURN',
  'MP_UPDATE_META',
  'MP_END_GAME',
  'MP_REQUEST_STATE',
]);

export class CloudArcadeMultiplayer {
  private static instance: CloudArcadeMultiplayer | null = null;

  // Connection / room state
  private _isInRoom = false;
  private _mySocketId: string | null = null;
  private _isHost = false;
  private _isMyTurn = false;

  // Event listeners
  private listeners: Map<MultiplayerEventType, Set<EventCallback<MultiplayerEventType>>> =
    new Map();

  // Raw message listener ref for cleanup
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  private debug = false;
  private initialised = false;

  // Constructor intentionally does NOT register the message listener.
  // Call init() to start listening.
  private constructor() {}

  /** Singleton accessor */
  public static getInstance(): CloudArcadeMultiplayer {
    if (!CloudArcadeMultiplayer.instance) {
      CloudArcadeMultiplayer.instance = new CloudArcadeMultiplayer();
    }
    return CloudArcadeMultiplayer.instance;
  }

  /**
   * Initialise — call once after your game loads.
   * Registers the message listener and sends MP_REQUEST_STATE.
   */
  public init(options?: { debug?: boolean }): void {
    if (this.initialised) return;
    this.initialised = true;
    this.debug = options?.debug ?? false;
    this.log('Initialising multiplayer integration…');
    this.setupMessageListener();
    this.requestState();
  }

  public setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  // ── Public Getters ────────────────────────────────────────

  public get isInRoom(): boolean {
    return this._isInRoom;
  }

  public get mySocketId(): string | null {
    return this._mySocketId;
  }

  public get isHost(): boolean {
    return this._isHost;
  }

  public get isMyTurn(): boolean {
    return this._isMyTurn;
  }

  // ── Outgoing Messages (Game → Parent) ─────────────────────

  /** Send a game action to all players via the parent bridge. */
  public sendAction(action: string, data: Record<string, unknown> = {}): void {
    this.log('sendAction', action, data);
    this.send({ type: 'MP_SEND_ACTION', payload: { action, data } });
  }

  /** Set the room's shared game state (usually host-authoritative). */
  public setState(state: Record<string, unknown>): void {
    this.log('setState', state);
    this.send({ type: 'MP_SET_STATE', payload: { state } });
  }

  /** End your turn. Optionally specify who goes next. */
  public endTurn(nextPlayerSocketId?: string): void {
    this.log('endTurn', nextPlayerSocketId ?? '(auto)');
    this.send({ type: 'MP_END_TURN', payload: { nextPlayerSocketId } });
  }

  /** Update your player metadata (avatar, colour, custom display data). */
  public updateMeta(meta: Record<string, unknown>): void {
    this.log('updateMeta', meta);
    this.send({ type: 'MP_UPDATE_META', payload: { meta } });
  }

  /** End the multiplayer session. */
  public endGame(): void {
    this.log('endGame');
    this.send({ type: 'MP_END_GAME' });
  }

  /** Request the current room state from the parent (for reconnects / init). */
  public requestState(): void {
    this.log('requestState');
    this.send({ type: 'MP_REQUEST_STATE' });
  }

  // ── Event Subscription ────────────────────────────────────

  public on<T extends MultiplayerEventType>(event: T, cb: MultiplayerEvents[T]): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as EventCallback<MultiplayerEventType>);
  }

  public off<T extends MultiplayerEventType>(event: T, cb: MultiplayerEvents[T]): void {
    this.listeners.get(event)?.delete(cb as EventCallback<MultiplayerEventType>);
  }

  public once<T extends MultiplayerEventType>(event: T, cb: MultiplayerEvents[T]): void {
    const wrapper = ((...args: Parameters<MultiplayerEvents[T]>) => {
      this.off(event, wrapper as MultiplayerEvents[T]);
      (cb as (...a: Parameters<MultiplayerEvents[T]>) => void)(...args);
    }) as MultiplayerEvents[T];
    this.on(event, wrapper);
  }

  // ── Private: Incoming Message Handling ────────────────────

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };
    window.addEventListener('message', this.messageHandler);
  }

  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object' || !('type' in data)) return;

    const msg = data as MultiplayerIncomingMessage;
    if (typeof msg.type !== 'string' || !msg.type.startsWith('MP_')) return;

    // Ignore our own outgoing messages echoing back in standalone mode.
    if (OUTGOING_TYPES.has(msg.type)) return;

    this.log('Received:', msg.type, (msg as { payload?: unknown }).payload);

    switch (msg.type) {
      case 'MP_ROOM_STATE': {
        const p = msg.payload;
        this._isInRoom = true;
        this._mySocketId = p.mySocketId;
        this._isHost = p.isHost;
        this._isMyTurn = p.isMyTurn;
        this.emit('roomState', p);
        break;
      }
      case 'MP_GAME_STARTED': {
        const p = msg.payload;
        this._isInRoom = true;
        this._mySocketId = p.mySocketId;
        this._isHost = p.isHost;
        this._isMyTurn = p.isMyTurn;
        this.emit('gameStarted', p);
        break;
      }
      case 'MP_GAME_ENDED': {
        this._isMyTurn = false;
        this.emit('gameEnded', msg.payload);
        break;
      }
      case 'MP_ACTION': {
        this.emit('action', msg.payload);
        break;
      }
      case 'MP_STATE_UPDATE': {
        this.emit('stateUpdate', msg.payload);
        break;
      }
      case 'MP_TURN_CHANGED': {
        this._isMyTurn = msg.payload.isMyTurn;
        this.emit('turnChanged', msg.payload);
        break;
      }
      case 'MP_ERROR': {
        this.emit('error', msg.payload);
        break;
      }
    }
  }

  // ── Private Helpers ───────────────────────────────────────

  private emit<T extends MultiplayerEventType>(
    event: T,
    ...args: Parameters<MultiplayerEvents[T]>
  ): void {
    const cbs = this.listeners.get(event);
    if (!cbs) return;
    cbs.forEach((cb) => {
      try {
        (cb as (...a: Parameters<MultiplayerEvents[T]>) => void)(...args);
      } catch (err) {
        console.error(`[Multiplayer] Error in "${event}" listener:`, err);
      }
    });
  }

  private send(message: MultiplayerOutgoingMessage): void {
    this.log('Sending:', message.type, (message as { payload?: unknown }).payload);
    window.parent.postMessage(message, '*');
  }

  private log(...args: unknown[]): void {
    if (this.debug) console.log('[Multiplayer]', ...args);
  }

  /** Clean up listeners — call when the game is being destroyed. */
  public destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.listeners.clear();
    this.initialised = false;
    CloudArcadeMultiplayer.instance = null;
  }
}

/** Convenience singleton export. Call `.init()` before use. */
export const cloudArcadeMultiplayer = CloudArcadeMultiplayer.getInstance();
