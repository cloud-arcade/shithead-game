import { useGameContext } from '../../context';
import { Button } from './Button';

export function PauseOverlay() {
  const { state, dispatch } = useGameContext();

  if (state.gameState !== 'paused') {
    return null;
  }

  const handleResume = () => {
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  const handleQuit = () => {
    dispatch({ type: 'SET_STATE', payload: 'menu' });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-in fade-in">
      <div className="bg-surface border border-white/10 rounded-2xl p-8 min-w-[280px] text-center animate-in slide-in-from-bottom-4">
        <h2 className="text-3xl font-semibold mb-6">Paused</h2>
        
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Score</span>
            <span className="text-2xl font-bold font-mono text-green-500">{state.score}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Lives</span>
            <span className="text-2xl font-bold font-mono text-green-500">{state.lives}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Level</span>
            <span className="text-2xl font-bold font-mono text-green-500">{state.level}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="primary" size="large" onClick={handleResume}>
            Resume
          </Button>
          <Button variant="secondary" size="medium" onClick={handleQuit}>
            Quit to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
