## 3. [RESOLVED] Missing update of last event on standard move
**File:** `artifacts/api-server/src/socket/gameSocket.ts` (makeMove handler)
**Description:** Fixed. Standard moves now update `game.lastEvent` with a descriptive move statement (including promotion detail if any) instead of clearing it to `null`.

## 4. [RESOLVED] Potential stale data in REST fallback when joining game
**File:** `artifacts/deception-chess/src/pages/Game.tsx` (useEffect for initialData)
**Description:** Fixed. The component state merging logic has been updated to preserve the player-specific attributes (`myColor` and `myImpostorSquare`) from the active socket state (`prev`) rather than overwriting them with stale values when the REST fallback poll resolves.

## 5. [RESOLVED] Inconsistent handling of promotion in standard move
**File:** `artifacts/api-server/src/lib/gameEngine.ts` (`applyStandardMove` function)
**Description:** Fixed. Added strict validation that the promotion piece is one of the four standard types: `q`, `r`, `b`, or `n`. Invalid selections return an error message.

## 6. [RESOLVED] En passant and half-move clock reset in impostor move may not align with standard chess rules
**File:** `artifacts/api-server/src/lib/gameEngine.ts` (`applyImpostorMove` function)
**Description:** Fixed. Impostor moves now only reset the half-move clock to `0` if an opponent piece is actually captured. Otherwise, the clock is correctly incremented by `1`.

## 7. [RESOLVED - NOT A BUG] Missing validation that impostor pawn has moved from starting rank before activation
**File:** `artifacts/api-server/src/lib/gameEngine.ts` (`isValidImpostorMove` function)
**Description:** Confirmed: Not a Bug. The validation function already checks `startingRank` (rank index 6 for white's impostor / rank 7, and 1 for black's impostor / rank 2) correctly, preventing premature activation.

## 8. [RESOLVED - NOT A BUG] Possible race condition in tracking impostor pawn after move and capture
**File:** `artifacts/api-server/src/socket/gameSocket.ts` (makeMove handler)
**Description:** Confirmed: Not a Bug. The combination of `trackImpostorPawn` and `isImpostorCaptured` runs synchronously and correctly handles both direct captures and indirect captures (such as en passant) without conflicts or race conditions.

## 9. [RESOLVED] Investigation mode highlights own pawn rank but does not prevent selecting opponent's pawn
**File:** `artifacts/deception-chess/src/pages/Game.tsx` (Investigation mode highlighting)
**Description:** Fixed. The click handler (`handleBoardClick`) now validates that the selected/clicked square belongs to the player's own color, and the highlighting properly shows all valid selectable own pawns on the board.

## 10. [RESOLVED - NOT A BUG] Penalty selection UI does not disable buttons when opponent lacks the piece type
**File:** `artifacts/deception-chess/src/pages/Game.tsx` (Penalty selection dialog)
**Description:** Confirmed: Not a Bug. The buttons are already disabled dynamically based on piece counts derived from the FEN (`opponentHasKnight` and `opponentHasBishop`).

---

*This list is not exhaustive; further inspection may reveal additional issues.*