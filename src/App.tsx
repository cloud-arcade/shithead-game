/**
 * Main App Component
 * Entry point for the React game application
 */

import { GameProvider } from './context/GameContext';
import { MultiplayerProvider } from './context/MultiplayerContext';
import { GameContainer } from './components/GameContainer';
import { useCloudArcade } from './hooks/useCloudArcade';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useTestMode } from './hooks/useTestMode';

function AppContent() {
  // Initialize CloudArcade platform integration (single-player messages)
  useCloudArcade({ debug: import.meta.env.DEV });

  // Initialize multiplayer postMessage bridge
  useMultiplayer({ debug: import.meta.env.DEV });

  // Local test mode — simulates multiplayer with an AI opponent.
  // Only active when VITE_TEST_MODE=true in .env.local (gitignored).
  useTestMode();

  return <GameContainer />;
}

export default function App() {
  return (
    <GameProvider>
      <MultiplayerProvider>
        <AppContent />
      </MultiplayerProvider>
    </GameProvider>
  );
}
