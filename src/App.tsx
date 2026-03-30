/**
 * Main App Component
 * Entry point for the React game application
 */

import { GameProvider } from './context/GameContext';
import { GameContainer } from './components/GameContainer';
import { useCloudArcade } from './hooks/useCloudArcade';

function AppContent() {
  // Initialize CloudArcade platform integration
  useCloudArcade({ debug: import.meta.env.DEV });

  return <GameContainer />;
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
