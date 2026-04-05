/**
 * Menu Screen — Shithead Card Game
 * Waiting room / lobby before the game starts
 */

import { useGameContext } from '../../context/GameContext';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { Button } from '../ui/Button';

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
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-background overflow-y-auto scrollbar-hide">
      <div className="flex flex-col items-center gap-4 sm:gap-6 text-center p-4 sm:p-6 max-w-md w-full">
        {/* Logo / Title */}
        <div>
          <p className="text-3xl sm:text-5xl mb-1 sm:mb-2">🃏</p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-red-400 to-pink-500 bg-clip-text text-transparent">
            Shithead
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">The Classic Card Game</p>
        </div>

        {/* Player list */}
        {mp.isInRoom && mp.players.length > 0 && (
          <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Players in Lobby ({mp.players.length})
            </h2>
            <div className="flex flex-col gap-2">
              {mp.players.map((p) => (
                <div
                  key={p.socketId}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg text-sm
                    ${p.socketId === mp.mySocketId
                      ? 'bg-emerald-500/10 border border-emerald-400/20 text-emerald-300'
                      : 'bg-white/5 text-zinc-300'}
                    ${p.status === 'disconnected' ? 'opacity-40' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {p.socketId === mp.mySocketId ? '👤' : '🎮'}
                    </span>
                    <span className="font-medium">
                      {p.displayName}
                      {p.socketId === mp.mySocketId && ' (You)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHost && <span className="text-amber-400 text-xs">★ Host</span>}
                    <span className={`text-[0.6rem] uppercase tracking-wider ${
                      p.status === 'ready' ? 'text-emerald-400' :
                      p.status === 'disconnected' ? 'text-red-400' : 'text-zinc-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="flex flex-col gap-3 w-full max-w-[240px]">
          {mp.isInRoom && mp.isHost ? (
            <Button
              onClick={handleStart}
              variant="primary"
              size="large"
              disabled={mp.players.length < 2}
            >
              {mp.players.length < 2 ? 'Need 2+ Players' : 'Start Game 🎮'}
            </Button>
          ) : mp.isInRoom ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-[3px] border-white/10 border-t-yellow-400 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">Waiting for host to start...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-white/10 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">Waiting for lobby connection...</p>
              <p className="text-[0.65rem] text-zinc-600">
                The hosting platform will connect you to a room.
              </p>
            </div>
          )}
        </div>

        {/* Rules summary */}
        <div className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 text-left">
          <h3 className="text-[0.65rem] font-medium text-zinc-500 uppercase tracking-wider mb-2">Quick Rules</h3>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li>• Play equal or higher value cards on the pile</li>
            <li>• <strong className="text-zinc-400">2</strong> resets → next player plays anything</li>
            <li>• <strong className="text-zinc-400">10</strong> burns the pile → you go again</li>
            <li>• 4 of same rank in a row → burns the pile</li>
            <li>• Can't play? Pick up the entire pile</li>
            <li>• Last player with cards = <strong className="text-red-400">Shithead</strong> 💩</li>
          </ul>
        </div>

        {/* Connection status */}
        <div className="text-xs">
          {state.isPlatformConnected ? (
            <span className="text-emerald-500">● Connected to CloudArcade</span>
          ) : (
            <span className="text-zinc-500">○ Running Standalone</span>
          )}
        </div>
      </div>
    </div>
  );
}
