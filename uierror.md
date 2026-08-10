# UI Positioning & Layout Report — Hidden Gambit

## Issue Summary
Vertical alignment discrepancy of `text.png` (`HIDDEN GAMBIT` title logo) and the `PLAY` button overlay in relation to the background artwork (`desktopbg.png`).

## Root Cause Analysis
1. **Flex Container Constraints**:
   - The main content area (`<main>`) is structured as a vertical flexbox containing `<TopHUD />`, `<HeroSection />`, and `<FeatureStrip />`.
   - In flex layout, `HeroSection` occupied the remaining vertical flex-1 area between the HUD and bottom strip. Standard flex alignment (`justify-end`) was aligning the title image to the bottom of the `HeroSection` container, which sits in the upper-middle region of the viewport (over the face/chest of the background chess pieces) rather than low on the screen.

2. **Image Asset Overlays vs. Background Geometry**:
   - `desktopbg.png` features the high-resolution Evil Knight and Bishop chess pieces.
   - The title asset (`text.png`) requires precise absolute positioning near the bottom of the viewport (`bottom-1` / `absolute` anchor) to keep the chess pieces' heads and glowing red eyes unobstructed.

## Corrective Changes Applied
- Replaced relative flex alignment in `HeroSection.tsx` with absolute positioning (`absolute bottom-1 left-1/2 -translate-x-1/2`).
- Fixed `text.png` logo scaling and anchored it directly above the tagline `EVERY MOVE HIDES A SECRET.` and the `PLAY` button.
