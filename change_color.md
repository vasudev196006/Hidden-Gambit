# Change Board Square Colors

## File to Edit
`artifacts/deception-chess/src/pages/Game.tsx` — **lines 551–552**

## What to Change

```tsx
// Current (warm brown theme)
darkSquareStyle: { backgroundColor: "#3d2b1f" },
lightSquareStyle: { backgroundColor: "#7d5c45" },

// Change to black & white
darkSquareStyle: { backgroundColor: "#000000" },
lightSquareStyle: { backgroundColor: "#ffffff" },

// Or any other colors you prefer, e.g. classic green board
darkSquareStyle: { backgroundColor: "#769656" },
lightSquareStyle: { backgroundColor: "#eeeed2" },
```

## How It Works
- `darkSquareStyle` → applies to dark (black) squares
- `lightSquareStyle` → applies to light (white) squares
- These are valid props inside the `options={{...}}` object on the `<Chessboard>` component
- The prop names are correct — just update the `backgroundColor` hex value

## Note
- Per-square highlights (last move, impostor, selected) go on top via `squareStyles` and may override the base color on highlighted squares — that is expected behavior.
