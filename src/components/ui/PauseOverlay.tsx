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
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="casino-panel rounded-xl p-6 min-w-[240px] text-center">
        <h2 className="text-xl font-bold text-gold-light uppercase tracking-wide mb-4">Paused</h2>
        <div className="flex flex-col gap-2">
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
