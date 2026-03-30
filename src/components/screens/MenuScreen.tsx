/**
 * Menu Screen Component
 * DELETE THIS and replace with your game's menu
 */

import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { Button } from '../ui/Button';

export function MenuScreen() {
  const { state, dispatch } = useGameContext();
  const { startSession } = useCloudArcade();

  const handleStart = () => {
    startSession();
    dispatch({ type: 'RESET_GAME' });
    dispatch({ type: 'SET_STATE', payload: 'playing' });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-950 to-background">
      <div className="flex flex-col items-center gap-8 text-center p-8">
        <h1 className="text-4xl font-semibold tracking-tight">Game Template</h1>
        <p className="text-lg text-zinc-500 -mt-4">CloudArcade Integration Test</p>

        <div className="flex flex-col gap-3 min-w-[200px]">
          <Button onClick={handleStart} variant="primary" size="large">
            Open Test Panel
          </Button>
        </div>

        <div className="mt-2 text-xs">
          {state.isPlatformConnected ? (
            <span className="text-green-500">● Connected to CloudArcade</span>
          ) : (
            <span className="text-zinc-500">○ Running Standalone</span>
          )}
        </div>
      </div>
    </div>
  );
}
