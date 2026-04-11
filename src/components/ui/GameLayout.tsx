import { memo, ReactNode } from 'react';
import { RulesPanel } from './RulesPanel';
import { HistoryPanel, GameLogEntry } from './HistoryPanel';

interface GameLayoutProps {
  children: ReactNode;
  gameLog: GameLogEntry[];
}

/**
 * GameLayout — Desktop wrapper with side panels
 * 
 * On desktop (≥1200px): Left panel (rules) | Game Table | Right panel (history)
 * On mobile/tablet: Full-width game table only
 */
export const GameLayout = memo(function GameLayout({ children, gameLog }: GameLayoutProps) {
  return (
    <div className="game-layout">
      {/* Left Panel - Rules (desktop only) */}
      <aside className="game-layout__panel game-layout__panel--left">
        <RulesPanel />
      </aside>

      {/* Center - Game Table (always visible, square aspect) */}
      <main className="game-layout__main">
        {children}
      </main>

      {/* Right Panel - History (desktop only) */}
      <aside className="game-layout__panel game-layout__panel--right">
        <HistoryPanel entries={gameLog} />
      </aside>
    </div>
  );
});
