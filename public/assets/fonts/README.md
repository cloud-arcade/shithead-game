# Fonts

Custom fonts for the game UI and text rendering.

## Recommended Formats

- **WOFF2**: Best compression, modern browsers
- **WOFF**: Good compression, wider support
- **TTF/OTF**: Fallback for older browsers

## Usage

### In CSS
```css
@font-face {
  font-family: 'GameFont';
  src: url('/assets/fonts/game-font.woff2') format('woff2'),
       url('/assets/fonts/game-font.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'GameFont', sans-serif;
}
```

### In Canvas
```typescript
// Load font before using in canvas
const font = new FontFace('GameFont', 'url(/assets/fonts/game-font.woff2)');
await font.load();
document.fonts.add(font);

// Now use in canvas
ctx.font = '24px GameFont';
ctx.fillText('Score: 100', 10, 30);
```

## Directory Structure

```
fonts/
├── pixel-font.woff2
├── pixel-font.woff
├── ui-font-regular.woff2
├── ui-font-bold.woff2
└── README.md
```

## Popular Game Fonts

- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) - Classic pixel font
- [VT323](https://fonts.google.com/specimen/VT323) - Retro terminal style
- [Silkscreen](https://fonts.google.com/specimen/Silkscreen) - Clean pixel font
- [Bungee](https://fonts.google.com/specimen/Bungee) - Bold display font

## Tips

- Use `font-display: swap` to prevent invisible text
- Preload important fonts in HTML `<head>`
- Subset fonts to include only needed characters
- Test font rendering in both CSS and Canvas contexts
