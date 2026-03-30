# Sprites

Sprite sheets and animation frames for game entities.

## Sprite Sheet Guidelines

- Use consistent frame sizes within a sheet (e.g., all 32x32 or 64x64)
- Arrange frames left-to-right for animations
- Include padding between frames if needed to prevent bleeding

## Naming Conventions

- `[entity]-[animation].png`: `player-walk.png`, `player-jump.png`
- `[entity]-sheet.png`: For combined sprite sheets

## Example Sprite Sheet Configuration

```typescript
// Define sprite data in code or JSON
const playerSprite = {
  src: '/assets/sprites/player-sheet.png',
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    idle: { row: 0, frames: 4, speed: 0.1 },
    walk: { row: 1, frames: 6, speed: 0.15 },
    jump: { row: 2, frames: 2, speed: 0.2 },
  }
};
```

## Directory Structure

```
sprites/
├── player/
│   ├── player-idle.png
│   ├── player-walk.png
│   └── player-jump.png
├── enemies/
│   ├── enemy-slime.png
│   └── enemy-bat.png
├── items/
│   ├── coin.png
│   └── powerup.png
└── effects/
    ├── explosion.png
    └── particles.png
```

## Tools for Creating Sprites

- [Aseprite](https://www.aseprite.org/) - Pixel art & animation
- [Piskel](https://www.piskelapp.com/) - Free online sprite editor
- [TexturePacker](https://www.codeandweb.com/texturepacker) - Sprite sheet generation
