# Hidden Gambit - Todo List

This file tracks the status of bugs and improvements found in `error.md`.

## Taken Care Of (Completed)

- [x] ~~**1. Investigation does not strip impostor powers**~~
  - *Status:* Completed. Clear `whiteImpostorSquare`/`blackImpostorSquare` when investigation is successful, disable UI activation, and customize backend error message.
- [x] ~~**3. Missing update of last event on standard move**~~
  - *Status:* Completed. Standard moves now update `game.lastEvent` with a descriptive message (e.g., "White moved from e2 to e4") instead of clearing it to `null`.
- [x] ~~**4. Potential stale data in REST fallback when joining game**~~
  - *Status:* Completed. Merging REST fallback state now correctly prioritizes the active WebSocket state rather than overwriting it with stale REST data.
- [x] ~~**5. Inconsistent handling of promotion in standard move**~~
  - *Status:* Completed. Promotion pieces are now validated to only accept standard pieces (`q`, `r`, `b`, `n`).
- [x] ~~**6. En passant and half-move clock reset in impostor move may not align with standard chess rules**~~
  - *Status:* Completed. Impostor moves only reset the half-move clock when an actual capture occurs.
- [x] ~~**9. Investigation mode highlights own pawn rank but does not prevent selecting opponent's pawn**~~
  - *Status:* Completed. Highlight all current pawn positions of the player's color and enforce selection validation in the board click handler.
- [x] ~~**11. Capturing pawn inherits impostor powers**~~
  - *Status:* Completed. Immediately nullify impostorSquare when lastMove.to equals impostorSquare in trackImpostorPawn to correctly mark it as captured.

## Still Needs to Be Taken Care Of

*(None - Core bugs resolved)*

## 🚀 Upcoming Player Experience & Feature Roadmap

- [x] **1. Game Clocks & Time Controls (Blitz / Rapid / Turn Countdown)**
  - *Status:* Completed. Match time controls (3m, 5m Blitz, 10m Rapid, 60s Turn Countdown) selectable during room creation with real-time digital clocks & server-side timeout flagging.
- [x] **3. Full Move History & Event Log (PGN Notation Panel)**
  - *Status:* Completed. Real-time scrollable move history panel displaying algebraic moves paired with variant badges (Impostor activations, Investigations, Penalties).
- [x] **4. One-Click Rematch System**
  - *Status:* Completed. "Request Rematch" button on Game Over overlay that swaps player colors (`White ↔ Black`) and resets the game state upon dual acceptance.
- [x] **5. Captured Pieces & Material Advantage Counter**
  - *Status:* Completed. Dynamic captured pieces tray computing missing piece icons and numerical point advantage (`+3`, `+1`) from active FENs.
- [x] **6. Mind Games & Reaction Emotes (Quick Chat)**
  - *Status:* Completed. Quick reaction emote picker bar broadcasting animated floating emoji overlays above player HUDs.

*(Note: Items 2 (Vs Bot / Tutorial) and 7 (Spectator Mode) excluded per player preference)*

## 🔒 Pre-Web Production Deployment Checklist

- [ ] **1. Restrict CORS & Origin Security**
  - *Goal:* Replace wildcard `origin: "*"` in `index.ts` & `app.ts` with domain environment variables (`process.env.CLIENT_ORIGIN`) to prevent unauthorized cross-origin requests.
- [ ] **2. Express & Socket Rate Limiting**
  - *Goal:* Integrate `express-rate-limit` on `/api/games` creation/join HTTP endpoints and limit WebSocket event submission frequency to prevent DDoS and room spamming.
- [ ] **3. Production Build & Environment Setup**
  - *Goal:* Set `NODE_ENV=production` and ensure static frontend assets in `artifacts/deception-chess/dist` are served properly by Express in monolith mode or via Vercel/Netlify proxy.
- [ ] **4. HTTPS & WSS (SSL Encryption)**
  - *Goal:* Enforce SSL/TLS encryption for live production hosting so connections run over `https://` and `wss://`.
- [ ] **5. Production Database Connection Pooling**
  - *Goal:* Configure PostgreSQL `DATABASE_URL` with SSL connection pooling (`sslmode=require`) via Neon, Supabase, or PgBouncer.

## No Action Required (Not a Bug)

- [x] **2. Investigation penalty may remove incorrect pieces when bishop missing**
  - *Confirmed:* Obsolete/Unused Code. The game rules now let the opponent select exactly one piece to remove (via the interactive penalty dialog / `selectPenalty` socket event), so the automatic penalty function `applyInvestigationPenalty` is never called.
- [x] **7. Missing validation that impostor pawn has moved from starting rank before activation**
  - *Confirmed:* Code already checks starting rank correctly (`startingRank` rank 7 for white and rank 2 for black).
- [x] **8. Possible race condition in tracking impostor pawn after move and capture**
  - *Confirmed:* Safe under current turn-by-turn game flow.
- [x] **10. Penalty selection UI does not disable buttons when opponent lacks the piece type**
  - *Confirmed:* UI already disables buttons correctly based on `opponentHasKnight`/`opponentHasBishop` computed states.
