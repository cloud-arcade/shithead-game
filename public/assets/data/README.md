# Data

JSON data files for game configuration, levels, and entity definitions.

## Common Use Cases

- Level definitions and layouts
- Entity configurations (enemies, items, etc.)
- Dialogue and text content
- Game balance settings
- Localization strings

## Directory Structure

```
data/
├── levels/
│   ├── level-1.json
│   ├── level-2.json
│   └── level-3.json
├── entities/
│   ├── enemies.json
│   └── items.json
├── config/
│   └── game-settings.json
└── localization/
    ├── en.json
    └── es.json
```

## Example Files

### Level Definition
```json
{
  "id": "level-1",
  "name": "Green Hills",
  "width": 1600,
  "height": 600,
  "playerStart": { "x": 50, "y": 500 },
  "background": "/assets/images/backgrounds/hills.png",
  "tiles": [...],
  "enemies": [
    { "type": "slime", "x": 300, "y": 500 },
    { "type": "bat", "x": 500, "y": 400 }
  ],
  "items": [
    { "type": "coin", "x": 200, "y": 450 },
    { "type": "powerup", "x": 400, "y": 400 }
  ]
}
```

### Entity Configuration
```json
{
  "enemies": {
    "slime": {
      "health": 1,
      "speed": 50,
      "damage": 1,
      "points": 10,
      "sprite": "/assets/sprites/enemies/slime.png"
    },
    "bat": {
      "health": 1,
      "speed": 100,
      "damage": 1,
      "points": 25,
      "sprite": "/assets/sprites/enemies/bat.png"
    }
  }
}
```

### Game Settings
```json
{
  "player": {
    "initialLives": 3,
    "moveSpeed": 200,
    "jumpForce": 400
  },
  "game": {
    "gravity": 800,
    "maxLevel": 10
  }
}
```

## Loading Data

```typescript
// Using fetch
async function loadLevel(levelId: string) {
  const response = await fetch(`/assets/data/levels/${levelId}.json`);
  return response.json();
}

// Preload all levels
const levelIds = ['level-1', 'level-2', 'level-3'];
const levels = await Promise.all(levelIds.map(loadLevel));
```
