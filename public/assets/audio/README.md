# Audio

Sound effects and music files for the game.

## Recommended Formats

- **MP3**: Wide browser support, good for music
- **OGG**: Good quality, some browser limitations
- **WAV**: Uncompressed, best for short sound effects
- **WebM**: Modern format with good compression

## Naming Conventions

- Sound effects: `sfx-[action].mp3` (e.g., `sfx-jump.mp3`, `sfx-coin.mp3`)
- Music: `music-[scene].mp3` (e.g., `music-menu.mp3`, `music-gameplay.mp3`)
- Ambient: `ambient-[type].mp3` (e.g., `ambient-forest.mp3`)

## Directory Structure

```
audio/
├── sfx/
│   ├── sfx-jump.mp3
│   ├── sfx-land.mp3
│   ├── sfx-coin.mp3
│   ├── sfx-hit.mp3
│   └── sfx-gameover.mp3
├── music/
│   ├── music-menu.mp3
│   ├── music-gameplay.mp3
│   └── music-gameover.mp3
└── ambient/
    └── ambient-wind.mp3
```

## Usage Example

```typescript
// Simple audio playback
const coinSound = new Audio('/assets/audio/sfx/sfx-coin.mp3');
coinSound.volume = 0.5;
coinSound.play();

// Audio with Web Audio API for advanced control
const audioContext = new AudioContext();
const response = await fetch('/assets/audio/music/music-gameplay.mp3');
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
```

## Tips

- Keep sound effects short (< 1 second when possible)
- Compress music files to reduce load times
- Preload critical sounds before gameplay
- Always handle autoplay restrictions (user interaction required)

## Free Audio Resources

- [Freesound](https://freesound.org/) - Sound effects
- [OpenGameArt](https://opengameart.org/) - Game audio
- [Incompetech](https://incompetech.com/) - Royalty-free music
