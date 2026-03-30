/**
 * Loading Screen Component
 */

import { useEffect, useState } from 'react';
import { useGameContext } from '../../context/GameContext';

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
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-950 to-background">
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 border-[3px] border-white/10 border-t-green-500 rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 tracking-wide">Loading...</p>
        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-150 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
