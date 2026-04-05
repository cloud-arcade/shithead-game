/**
 * Loading Screen Component
 */

import { useEffect, useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { getAssetPath } from '../../game/engine';

export function LoadingScreen() {
  const { dispatch } = useGameContext();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading - replace with actual asset loading
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 20;
        if (next >= 100) {
          clearInterval(interval);
          // Transition to menu after loading
          setTimeout(() => {
            dispatch({ type: 'SET_STATE', payload: 'menu' });
          }, 300);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <img
        src={getAssetPath('assets/game-assets/table_and_background_color/bg_1.png')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        draggable={false}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-[3px] border-white/10 border-t-gold rounded-full animate-spin" />
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Loading...</p>
        <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c49a2a, #e8c44a)' }}
          />
        </div>
      </div>
    </div>
  );
}
