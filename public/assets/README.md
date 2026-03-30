# Assets Folder

Place your game assets here:

- `/images/` - Sprites, backgrounds, UI elements
- `/audio/` - Sound effects and music
- `/fonts/` - Custom fonts (if needed)
- `/data/` - JSON data files (levels, configs, etc.)

## Recommended Formats

- **Images:** WebP (preferred), PNG for transparency, JPEG for photos
- **Audio:** MP3 (good compression and browser support)
- **Fonts:** WOFF2 (preferred), WOFF

## Asset Loading

Load assets using the AssetLoader in your main.ts:

```typescript
await assetLoader.load({
  images: [
    { key: 'player', src: '/assets/images/player.png' },
    { key: 'enemy', src: '/assets/images/enemy.png' },
  ],
  audio: [
    { key: 'jump', src: '/assets/audio/jump.mp3' },
    { key: 'collect', src: '/assets/audio/collect.mp3' },
  ],
});
```
