import { memo, useRef, useEffect } from 'react';

export interface GameLogEntry {
  id?: string;
  timestamp?: number;
  time?: number; // Alternative for timestamp
  type?: 'play' | 'pickup' | 'burn' | 'skip' | 'finish' | 'system';
  player?: string;
  cards?: string;
  message: string;
}

interface HistoryPanelProps {
  entries: GameLogEntry[];
}

const getEntryIcon = (entry: GameLogEntry) => {
  if (entry.type) {
    switch (entry.type) {
      case 'play': return '🃏';
      case 'pickup': return '📥';
      case 'burn': return '🔥';
      case 'skip': return '⏭️';
      case 'finish': return '🏆';
      case 'system': return '⚙️';
    }
  }
  // Infer from message
  const msg = entry.message.toLowerCase();
  if (msg.includes('burn') || msg.includes('🔥')) return '🔥';
  if (msg.includes('pick')) return '📥';
  if (msg.includes('finish') || msg.includes('winner')) return '🏆';
  return '🃏';
};

const getEntryClass = (entry: GameLogEntry) => {
  if (entry.type) {
    switch (entry.type) {
      case 'burn': return 'history-entry--burn';
      case 'pickup': return 'history-entry--pickup';
      case 'finish': return 'history-entry--finish';
    }
  }
  // Infer from message
  const msg = entry.message.toLowerCase();
  if (msg.includes('burn') || msg.includes('🔥')) return 'history-entry--burn';
  if (msg.includes('pick')) return 'history-entry--pickup';
  if (msg.includes('finish') || msg.includes('winner')) return 'history-entry--finish';
  return '';
};

const formatTime = (entry: GameLogEntry) => {
  const ts = entry.timestamp || entry.time;
  if (!ts) return '';
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const HistoryPanel = memo(function HistoryPanel({ entries }: HistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <span className="history-panel__icon">📜</span>
        <h2 className="history-panel__title">Game History</h2>
        <span className="history-panel__count">{entries.length}</span>
      </div>

      <div className="history-panel__content" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="history-panel__empty">
            <span className="history-panel__empty-icon">🎴</span>
            <p>No moves yet</p>
            <p className="history-panel__empty-hint">Game actions will appear here</p>
          </div>
        ) : (
          <div className="history-panel__list">
            {entries.map((entry, idx) => (
              <div key={entry.id || idx} className={`history-entry ${getEntryClass(entry)}`}>
                <span className="history-entry__icon">{getEntryIcon(entry)}</span>
                <div className="history-entry__content">
                  <span className="history-entry__message">{entry.message}</span>
                  <span className="history-entry__time">{formatTime(entry)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
