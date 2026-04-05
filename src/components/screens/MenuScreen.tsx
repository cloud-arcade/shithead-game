/**
 * Menu Screen — Casino-style lobby
 */

import { useGameContext } from '../../context/GameContext';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { getAssetPath } from '../../game/engine';
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
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Casino background */}
      <img
        src={getAssetPath('assets/game-assets/interface_game/bg_1.png')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Table overlay - mobile: top-aligned, desktop: bottom-aligned to preserve rounded edge */}
      <img
        src={getAssetPath('assets/game-assets/interface_game/table_1.png')}
        alt=""
        className="absolute top-0 left-0 w-full h-[110vh] object-cover object-top lg:h-[105vh] lg:object-bottom"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center p-4 max-w-md w-full">
        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-light text-glow-gold uppercase">
            Shithead
          </h1>
          <p className="text-[0.6rem] text-white/40 mt-0.5 uppercase tracking-widest">
            The Classic Card Game
          </p>
        </div>

        {/* Player list */}
        {mp.isInRoom && mp.players.length > 0 && (
          <div className="w-full casino-panel rounded-xl p-3">
            <h2 className="text-[0.6rem] font-semibold text-gold/60 uppercase tracking-wider mb-2">
              Players ({mp.players.length})
            </h2>
            <div className="flex flex-col gap-1.5">
              {mp.players.map((p) => (
                <div
                  key={p.socketId}
                  className={`
                    flex items-center justify-between px-3 py-1.5 rounded-lg text-xs
                    ${p.socketId === mp.mySocketId
                      ? 'bg-green-500/10 border border-green-400/20 text-green-300'
                      : 'bg-white/5 text-white/70'}
                    ${p.status === 'disconnected' ? 'opacity-40' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={getAssetPath('assets/game-assets/interface_game/avatar_player_2.png')}
                      alt=""
                      className="w-6 h-6 rounded-full border border-white/20"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="font-semibold">
                      {p.displayName}
                      {p.socketId === mp.mySocketId && ' (You)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHost && <span className="text-gold text-[0.55rem] font-bold">HOST</span>}
                    <span className={`text-[0.5rem] uppercase tracking-wider font-semibold ${
                      p.status === 'ready' ? 'text-green-400' :
                      p.status === 'disconnected' ? 'text-red-400' : 'text-white/30'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start / waiting */}
        <div className="flex flex-col gap-2 w-full max-w-[220px]">
          {mp.isInRoom && mp.isHost ? (
            <Button
              onClick={handleStart}
              variant="primary"
              size="large"
              disabled={mp.players.length < 2}
            >
              {mp.players.length < 2 ? 'Need 2+ Players' : 'Start Game'}
            </Button>
          ) : mp.isInRoom ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-[3px] border-white/10 border-t-gold rounded-full animate-spin" />
              <p className="text-xs text-white/50 font-medium">Waiting for host...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-[3px] border-white/10 border-t-green-400 rounded-full animate-spin" />
              <p className="text-xs text-white/50 font-medium">Connecting to lobby...</p>
            </div>
          )}
        </div>

        {/* Quick rules */}
        <div className="w-full casino-panel rounded-xl p-3 text-left">
          <h3 className="text-[0.55rem] font-semibold text-gold/50 uppercase tracking-wider mb-1.5">Quick Rules</h3>
          <ul className="text-[0.55rem] text-white/40 space-y-0.5 leading-relaxed">
            <li>• Play equal or higher value cards</li>
            <li>• <strong className="text-white/60">2</strong> resets, <strong className="text-white/60">10</strong> burns the pile</li>
            <li>• 4 of same rank in a row burns the pile</li>
            <li>• Can't play? Pick up the entire pile</li>
            <li>• Last player with cards = <strong className="text-red-400">Shithead</strong></li>
          </ul>
        </div>

        {/* Connection status */}
        <div className="text-[0.55rem] font-medium">
          {state.isPlatformConnected ? (
            <span className="text-green-400/60">● Connected</span>
          ) : (
            <span className="text-white/20">○ Standalone</span>
          )}
        </div>
      </div>
    </div>
  );
}
