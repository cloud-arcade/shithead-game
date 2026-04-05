/**
 * Fullscreen Landscape Control
 *
 * Sends postMessages to the parent frame (CloudArcade) to request
 * fullscreen landscape mode during gameplay, and revert on exit.
 */

export function requestFullscreenLandscape(): void {
  try {
    window.parent.postMessage(
      { type: 'FORCE_FULLSCREEN_LANDSCAPE' },
      '*'
    );
  } catch {
    // Silently fail if no parent frame
  }
}

export function exitFullscreenLandscape(): void {
  try {
    window.parent.postMessage(
      { type: 'EXIT_FULLSCREEN_LANDSCAPE' },
      '*'
    );
  } catch {
    // Silently fail if no parent frame
  }
}
