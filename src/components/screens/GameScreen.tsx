/**
 * Test Panel Screen
 * Simple button interface for testing CloudArcade platform integration
 * Includes both single-player AND multiplayer postMessage testing.
 *
 * DELETE THIS FILE and replace with your actual game!
 */

import { useState } from 'react';
import { useGameContext } from '../../context/GameContext';
import { useCloudArcade } from '../../hooks/useCloudArcade';
import { useMultiplayerState } from '../../context/MultiplayerContext';
import { useMultiplayerActions } from '../../hooks/useMultiplayer';
import { Button } from '../ui/Button';

export function GameScreen() {
  const { state, dispatch } = useGameContext();
  const { startSession, endSession, submitScore, gameOver, reportError } = useCloudArcade();
  const mp = useMultiplayerState();
  const {
    sendAction,
    setState: mpSetState,
    endTurn,
    updateMeta,
    endGame: mpEndGame,
    requestState: mpRequestState,
  } = useMultiplayerActions();

  // Local state for the multiplayer action form
  const [actionName, setActionName] = useState('PLACE_PIECE');
  const [actionData, setActionData] = useState('{"x":0,"y":0}');
  const [metaData, setMetaData] = useState('{"color":"#ff0000"}');

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

  // Multiplayer helpers
  const handleSendAction = () => {
    try {
      const data = JSON.parse(actionData);
      sendAction(actionName, data);
    } catch {
      sendAction(actionName, {});
    }
  };

  const handleSetState = () => {
    try {
      const data = JSON.parse(actionData);
      mpSetState(data);
    } catch {
      mpSetState({});
    }
  };

  const handleUpdateMeta = () => {
    try {
      const data = JSON.parse(metaData);
      updateMeta(data);
    } catch {
      updateMeta({});
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col gap-4 p-6 bg-gradient-to-b from-zinc-950 to-background overflow-auto">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Platform Test Panel</h1>
        <p className="text-sm text-zinc-500 mt-1">CloudArcade postMessage Integration</p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* ── Connection Status ───────────────────────────────── */}
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

        {/* ── Score Testing ───────────────────────────────────── */}
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

        {/* ── Session Controls ────────────────────────────────── */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Session</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => startSession()} variant="primary" size="small">Start</Button>
            <Button onClick={() => endSession()} variant="secondary" size="small">End</Button>
          </div>
        </section>

        {/* ── Game Over Testing ───────────────────────────────── */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Game Over</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => handleGameOver(false)} variant="secondary" size="small">Normal</Button>
            <Button onClick={() => handleGameOver(true)} variant="primary" size="small">High Score</Button>
          </div>
        </section>

        {/* ── Error Testing ───────────────────────────────────── */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Error</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleSendError} variant="danger" size="small">Send Test Error</Button>
          </div>
        </section>

        {/* ── Navigation ──────────────────────────────────────── */}
        <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-zinc-500 uppercase tracking-wider mb-3">Navigation</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleBackToMenu} variant="secondary" size="small">← Menu</Button>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────
            MULTIPLAYER SECTION
            ────────────────────────────────────────────────────── */}

        {/* ── MP Room Status ──────────────────────────────────── */}
        <section className="col-span-2 bg-indigo-500/[0.06] border border-indigo-400/20 rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider mb-3">
            Multiplayer Status
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">In Room</span>
              <span className={`text-sm font-semibold font-mono ${mp.isInRoom ? 'text-green-500' : 'text-zinc-500'}`}>
                {mp.isInRoom ? '✓ Yes' : '○ No'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Room Status</span>
              <span className="text-sm font-semibold font-mono text-white">{mp.roomStatus ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Host</span>
              <span className={`text-sm font-semibold font-mono ${mp.isHost ? 'text-amber-400' : 'text-zinc-500'}`}>
                {mp.isHost ? '★ Yes' : '○ No'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 p-2 bg-black/30 rounded-lg">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">My Turn</span>
              <span className={`text-sm font-semibold font-mono ${mp.isMyTurn ? 'text-green-500' : 'text-zinc-500'}`}>
                {mp.isMyTurn ? '✓ Yes' : '○ No'}
              </span>
            </div>
          </div>

          {/* My player info */}
          {mp.myPlayer && (
            <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-400 bg-black/20 px-3 py-2 rounded-lg">
              <span className="text-indigo-300">P{mp.myPlayer.playerNumber}</span>
              <span>{mp.myPlayer.displayName}</span>
              <span className="text-zinc-600">({mp.mySocketId?.slice(0, 8)})</span>
              <span className={mp.myPlayer.status === 'playing' ? 'text-green-500' : 'text-zinc-500'}>{mp.myPlayer.status}</span>
            </div>
          )}

          {/* Players list */}
          {mp.players.length > 0 && (
            <div className="mt-3">
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide">Players</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {mp.players.map((p) => (
                  <span
                    key={p.socketId}
                    className={`text-xs font-mono px-2 py-1 rounded-md ${
                      p.socketId === mp.mySocketId
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                    } ${p.status === 'disconnected' ? 'opacity-50 line-through' : ''}`}
                  >
                    P{p.playerNumber} {p.displayName}
                    {p.isHost && ' ★'}
                    {p.socketId === mp.currentTurn && ' ◀'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last error */}
          {mp.lastError && (
            <div className="mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <strong>{mp.lastError.code}:</strong> {mp.lastError.message}
            </div>
          )}
        </section>

        {/* ── MP Send Action ──────────────────────────────────── */}
        <section className="bg-indigo-500/[0.06] border border-indigo-400/20 rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider mb-3">
            Send Action
          </h2>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder="Action name"
              className="w-full px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
            />
            <textarea
              value={actionData}
              onChange={(e) => setActionData(e.target.value)}
              placeholder='{"key":"value"}'
              rows={2}
              className="w-full px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50 resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleSendAction} variant="primary" size="small">
                Send Action
              </Button>
              <Button onClick={handleSetState} variant="secondary" size="small">
                Set State
              </Button>
            </div>
          </div>
        </section>

        {/* ── MP Turn / Meta / End ────────────────────────────── */}
        <section className="bg-indigo-500/[0.06] border border-indigo-400/20 rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider mb-3">
            Multiplayer Controls
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={() => endTurn()} variant="primary" size="small">End Turn</Button>
              <Button onClick={() => mpEndGame()} variant="danger" size="small">End Game</Button>
            </div>
            <Button onClick={() => mpRequestState()} variant="secondary" size="small">
              Request State
            </Button>
            <input
              type="text"
              value={metaData}
              onChange={(e) => setMetaData(e.target.value)}
              placeholder='{"color":"#ff0000"}'
              className="w-full px-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
            />
            <Button onClick={handleUpdateMeta} variant="secondary" size="small">
              Update Meta
            </Button>
          </div>
        </section>

        {/* ── MP Last Action Received ─────────────────────────── */}
        <section className="col-span-2 bg-indigo-500/[0.06] border border-indigo-400/20 rounded-xl p-4 flex flex-col">
          <h2 className="text-[0.7rem] font-medium text-indigo-400 uppercase tracking-wider mb-3">
            Action Stream &amp; Shared State
          </h2>

          {/* Action history (last 5) */}
          {mp.actionHistory.length > 0 ? (
            <div className="flex flex-col gap-1 mb-3">
              {mp.actionHistory.slice(-5).map((a, i) => (
                <div key={i} className="text-xs font-mono text-zinc-400 bg-black/20 px-2 py-1 rounded">
                  <span className="text-indigo-400">{a.action}</span>{' '}
                  <span className="text-zinc-500">from {a.senderSocketId.slice(0, 8)}</span>{' '}
                  <span className="text-zinc-600">{JSON.stringify(a.data)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 mb-3">No actions received yet.</p>
          )}

          {Object.keys(mp.sharedGameState).length > 0 && (
            <>
              <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wide mb-1">Shared State (MP_STATE_UPDATE)</span>
              <pre className="text-xs font-mono text-zinc-300 bg-black/30 p-3 rounded-lg overflow-auto max-h-24">
                {JSON.stringify(mp.sharedGameState, null, 2)}
              </pre>
            </>
          )}
        </section>
      </div>

      <p className="text-[0.7rem] text-zinc-600 text-center">
        Open DevTools console for logs • <code className="bg-white/5 px-1.5 py-0.5 rounded text-[0.65rem] font-mono">npm run test:harness</code> for platform simulation
      </p>
    </div>
  );
}
