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

*(None)*

## No Action Required (Not a Bug)

- [x] **2. Investigation penalty may remove incorrect pieces when bishop missing**
  - *Confirmed:* Obsolete/Unused Code. The game rules now let the opponent select exactly one piece to remove (via the interactive penalty dialog / `selectPenalty` socket event), so the automatic penalty function `applyInvestigationPenalty` is never called.
- [x] **7. Missing validation that impostor pawn has moved from starting rank before activation**
  - *Confirmed:* Code already checks starting rank correctly (`startingRank` rank 7 for white and rank 2 for black).
- [x] **8. Possible race condition in tracking impostor pawn after move and capture**
  - *Confirmed:* Safe under current turn-by-turn game flow.
- [x] **10. Penalty selection UI does not disable buttons when opponent lacks the piece type**
  - *Confirmed:* UI already disables buttons correctly based on `opponentHasKnight`/`opponentHasBishop` computed states.
