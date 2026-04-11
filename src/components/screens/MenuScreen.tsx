/**
 * MenuScreen — Clean lobby screen.
 *
 * Shows player list, start button, and quick rules.
 */

import { useGameContext } from '../../context/GameContext';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';

export function MenuScreen() {
  const { state, dispatch } = useGameContext();
  const { startSession } = useCloudArcade();
  const mp = useMultiplayerState();

  const handleStart = () => {
    startSession();
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  return (
    <div className="menu-screen">
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 className="menu-title">Shithead</h1>
        <p className="menu-subtitle">The Classic Card Game</p>
      </div>

      {/* Player list */}
      {mp.isInRoom && mp.players.length > 0 && (
        <div className="menu-players">
          <div className="menu-players__header">
            Players ({mp.players.length})
          </div>
          {mp.players.map((p) => (
            <div
              key={p.socketId}
              className={`menu-player-row ${
                p.socketId === mp.mySocketId ? 'menu-player-row--me' : ''
              }`}
              style={
                p.status === 'disconnected' ? { opacity: 0.4 } : undefined
              }
            >
              <div className="menu-player-row__avatar">
                {p.displayName?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="menu-player-row__name">
                {p.displayName}
                {p.socketId === mp.mySocketId && ' (You)'}
              </span>
              <div className="menu-player-row__badges">
                {p.isHost && (
                  <span className="menu-player-row__badge">Host</span>
                )}
                <span
                  className="menu-player-row__status"
                  style={{
                    color:
                      p.status === 'ready'
                        ? '#4ade80'
                        : p.status === 'disconnected'
                        ? '#f87171'
                        : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start / waiting */}
      {mp.isInRoom && mp.isHost ? (
        <button
          className="menu-btn"
          onClick={handleStart}
          disabled={mp.players.length < 2}
        >
          {mp.players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
        </button>
      ) : mp.isInRoom ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div className="spinner" />
          <p
            style={{
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            Waiting for host…
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div className="spinner" />
          <p
            style={{
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            Connecting to lobby…
          </p>
        </div>
      )}

      {/* Quick rules */}
      <div className="menu-rules">
        <div className="menu-rules__title">Quick Rules</div>
        <ul className="menu-rules__list">
          <li>• Play equal or higher value cards</li>
          <li>
            • <strong>2</strong> resets the pile, <strong>10</strong> burns it
          </li>
          <li>• 4 of the same rank in a row burns the pile</li>
          <li>• Can&rsquo;t play? Pick up the entire pile</li>
          <li>
            • Last player with cards = <strong style={{ color: '#f87171' }}>Shithead</strong>
          </li>
        </ul>
      </div>

      {/* Connection status */}
      <div className="menu-connection">
        {state.isPlatformConnected ? (
          <span style={{ color: 'rgba(74, 222, 128, 0.6)' }}>● Connected</span>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>○ Standalone</span>
        )}
      </div>

      {/* Info */}
      <p className="menu-info">
        2–4 players • Get rid of your cards • Last player is the Shithead!
      </p>
    </div>
  );
}
