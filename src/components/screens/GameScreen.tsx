/**
 * Test Panel Screen
 * Simple button interface for testing CloudArcade platform integration
 * 
 * DELETE THIS FILE and replace with your actual game!
 */

import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { Button } from '../ui/Button';

export function GameScreen() {
  const { state, dispatch } = useGameContext();
  const { startSession, endSession, submitScore, gameOver, reportError } = useCloudArcade();

  const handleAddScore = (amount: number) => {
    dispatch({ type: 'ADD_SCORE', payload: amount });
  };

  const handleSubmitScore = () => {
    submitScore(state.score, { level: state.level, testMode: true });
  };

  const handleGameOver = (isHighScore: boolean) => {
    gameOver(state.score, true);
    if (isHighScore && state.score > state.highScore) {
      dispatch({ type: 'SET_HIGH_SCORE', payload: state.score });
    }
    dispatch({ type: 'SET_STATE', payload: 'gameover' });
  };

  const handleSendError = () => {
    reportError('Test error from game');
  };

  const handleBackToMenu = () => {
    dispatch({ type: 'SET_STATE', payload: 'menu' });
  };

  return (
    <div className="absolute inset-0 flex flex-col gap-4 p-6 bg-gradient-to-b from-zinc-950 to-background overflow-hidden">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Platform Test Panel</h1>
        <p className="text-sm text-zinc-500 mt-1">CloudArcade postMessage Integration</p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Connection Status */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Status</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Platform</span>
              <span className={`text-sm font-semibold font-mono ${state.isPlatformConnected ? 'text-green-500' : 'text-zinc-500'}`}>
                {state.isPlatformConnected ? '✓ Connected' : '○ Standalone'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">User</span>
              <span className="text-sm font-semibold font-mono text-white">{state.userId || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Session</span>
              <span className="text-sm font-semibold font-mono text-white">{state.sessionId?.slice(0, 8) || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">State</span>
              <span className="text-sm font-semibold font-mono text-white">{state.gameState}</span>
            </div>
          </div>
        </section>

        {/* Score Testing */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Score</h2>
          <div className="flex justify-center gap-8 mb-3 text-sm">
            <span>Current: <strong className="text-xl font-bold font-mono text-green-500">{state.score}</strong></span>
            <span>Best: <strong className="text-xl font-bold font-mono text-green-500">{state.highScore}</strong></span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => handleAddScore(10)} size="small">+10</Button>
            <Button onClick={() => handleAddScore(100)} size="small">+100</Button>
            <Button onClick={() => handleAddScore(1000)} size="small">+1K</Button>
            <Button onClick={() => dispatch({ type: 'SET_SCORE', payload: 0 })} variant="secondary" size="small">Reset</Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Button onClick={handleSubmitScore} variant="primary" size="small">Submit Score</Button>
          </div>
        </section>

        {/* Session Controls */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Session</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => startSession()} variant="primary" size="small">Start</Button>
            <Button onClick={() => endSession()} variant="secondary" size="small">End</Button>
          </div>
        </section>

        {/* Game Over Testing */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Game Over</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => handleGameOver(false)} variant="secondary" size="small">Normal</Button>
            <Button onClick={() => handleGameOver(true)} variant="primary" size="small">High Score</Button>
          </div>
        </section>

        {/* Error Testing */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Error</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleSendError} variant="danger" size="small">Send Test Error</Button>
          </div>
        </section>

        {/* Navigation */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Navigation</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleBackToMenu} variant="secondary" size="small">← Menu</Button>
          </div>
        </section>
      </div>

      <p className="text-[0.7rem] text-zinc-600 text-center">
        Open DevTools console for logs • <code className="bg-white/5 px-1.5 py-0.5 rounded text-[0.65rem] font-mono">npm run test:harness</code> for platform simulation
      </p>
    </div>
  );
}
