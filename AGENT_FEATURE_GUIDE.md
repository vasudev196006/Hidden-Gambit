# Hidden Gambit — AI Agent Feature Engineering Manual

> **Audience**: An AI agent about to add, extend, or debug a feature in this codebase.  
> **Goal**: Let you understand every internal contract so you never break existing logic.  
> Read this entire file before touching a single line of code.

---

## Table of Contents

1. [Monorepo Layout & Workspace Packages](#1-monorepo-layout--workspace-packages)
2. [Tech Stack Quick-Reference](#2-tech-stack-quick-reference)
3. [Game Rules — The Source of All Logic](#3-game-rules--the-source-of-all-logic)
4. [Database Schema — The Canonical State](#4-database-schema--the-canonical-state)
5. [gameEngine.ts — Pure Logic Layer](#5-gameenginets--pure-logic-layer)
6. [gameStore.ts — Persistence & Cache](#6-gamestorets--persistence--cache)
7. [REST API Contract](#7-rest-api-contract)
8. [Socket.IO Event Protocol](#8-socketio-event-protocol)
9. [Frontend State Machine (Game.tsx)](#9-frontend-state-machine-gametsx)
10. [Critical Data Invariants You Must Never Break](#10-critical-data-invariants-you-must-never-break)
11. [Safe Patterns for Adding New Features](#11-safe-patterns-for-adding-new-features)
12. [Known Gotchas & Banned Patterns](#12-known-gotchas--banned-patterns)
13. [Development Commands Cheat Sheet](#13-development-commands-cheat-sheet)

---

## 1. Monorepo Layout & Workspace Packages

```
Hidden-Gambit/
├── artifacts/
│   ├── api-server/         @workspace/api-server   — Express + Socket.IO backend
│   └── deception-chess/    @workspace/deception-chess — React + Vite frontend
├── lib/
│   ├── db/                 @workspace/db            — Drizzle ORM schema & connection
│   ├── api-client-react/   @workspace/api-client-react — React Query hooks + fetch wrapper
│   ├── api-zod/            @workspace/api-zod       — Zod request/response schemas
│   └── api-spec/           @workspace/api-spec      — OpenAPI spec (reference only)
├── scripts/                Utility scripts (post-merge hook, etc.)
├── pnpm-workspace.yaml     Workspace + catalog config
├── CLAUDE.md               Dev commands & architecture reference
└── AGENT_FEATURE_GUIDE.md  <- YOU ARE HERE
```

**Package dependency order** (lower -> upper; never create cycles):

```
@workspace/db  ->  @workspace/api-server
@workspace/api-zod  ->  @workspace/api-server
@workspace/api-client-react  ->  @workspace/deception-chess
```

When you modify `@workspace/db` (schema), you **must** rebuild it before the server picks up the new types:
```bash
pnpm --filter @workspace/db run build
pnpm --filter @workspace/db run push   # push schema to Postgres
```

---

## 2. Tech Stack Quick-Reference

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + Vite |
| Frontend routing | Wouter (`/`, `/join/:id`, `/game/:id`) |
| Frontend state - server | TanStack React Query v5 |
| Frontend state - UI | `useState` / `useCallback` |
| Frontend real-time | Socket.IO client |
| Chess logic | chess.js |
| Board rendering | react-chessboard |
| Styling | TailwindCSS v4 + Radix UI primitives |
| Backend framework | Express + Node.js (ESM via esbuild) |
| Backend real-time | Socket.IO v4 |
| Backend validation | Zod (`@workspace/api-zod`) |
| Backend logging | Pino (structured JSON) |
| ORM | Drizzle ORM (Postgres) |
| Database | PostgreSQL |
| Package manager | pnpm workspaces |

---

## 3. Game Rules — The Source of All Logic

Understanding these rules is mandatory. Every server-side validation and client-side guard flows from them.

### 3.1 Game Lifecycle (status field)

```
waiting  ->  selecting  ->  active  ->  finished
```

| Status | Meaning |
|---|---|
| `waiting` | White player created the game; waiting for Black to join |
| `selecting` | Both players joined; each secretly selects their impostor pawn |
| `active` | Both impostors selected; normal gameplay |
| `finished` | Game over (checkmate, stalemate, draw, or resign) |

**Transitions:**
- `waiting -> selecting`: Black joins via `POST /api/games/:id/join`
- `selecting -> active`: Both players submit impostor via `POST /api/games/:id/impostor` — the second submission triggers the transition
- `active -> finished`: checkmate, stalemate, draw (`checkGameOver`), or `resign` socket event

### 3.2 The Impostor Mechanic

Each player secretly selects **one of the opponent's pawns** as their impostor on the **a, b, c, f, g, h files** at the starting rank (rank 7 for Black's pawns selected by White; rank 2 for White's pawns selected by Black).

- **White** selects a pawn from **Black's back rank** (row 7, squares `a7`, `b7`, `c7`, `f7`, `g7`, `h7`)
- **Black** selects a pawn from **White's back rank** (row 2, squares `a2`, `b2`, `c2`, `f2`, `g2`, `h2`)
- d2 and e2 (White center pawns) and d7 and e7 (Black center pawns) are **excluded** from impostor selection

> **Why exclude center files?** The `VALID_IMPOSTOR_FILES = ["a","b","c","f","g","h"]` constant in `gameEngine.ts` defines this. Never change it without verifying all rules logic.

**Activation** (once per game, during the impostor owner's turn):
- The pawn must have **left its starting rank** before it can be activated
- The player picks a **move type**: `knight` (L-shape forward only) or `bishop` (diagonal slide forward only)
- The impostor pawn teleports to that destination
- After activation: `xImpostorUsed = true`, `xImpostorSquare = null`, `xImpostorRevealed = <toSquare>`

### 3.3 The Investigation Mechanic

Each player may investigate **once per game** on their own turn.

- Player clicks one of **their own pawns** that they think the opponent secretly controls
- If **correct**: the suspect pawn is added to `securedSquares` and the opponent loses their impostor ability (`xImpostorSquare = null`, `xImpostorRevealed = <square>`)
- If **wrong**: the investigating player's **turn is skipped** and the opponent gets to **remove one knight or bishop** from the investigator's pieces; this is a two-step interactive process (see `penaltyTargetColor`)

### 3.4 Secured Pawns

A secured pawn (correctly identified impostor) is immune to capture by **knights and bishops only**. Queens, rooks, and kings can still capture them. Secured squares are tracked in `securedSquares: string[]`.

### 3.5 Penalty Flow (penaltyTargetColor)

When a wrong investigation occurs:
1. `game.penaltyTargetColor` is set to the **investigator's** color (the one who made the wrong guess)
2. `game.turn` is set to the **opponent's** color (they choose the penalty)
3. **No moves may be made while `penaltyTargetColor` is non-null** — all socket events check this first
4. Opponent emits `selectPenalty` with a specific square from the penalized player's pieces (knight or bishop)
5. Server removes that piece, clears `penaltyTargetColor`, saves game

---

## 4. Database Schema — The Canonical State

File: `lib/db/src/schema/games.ts`

```typescript
gamesTable = pgTable("games", {
  id: text                     // Primary key, 6-char uppercase alphanumeric
  status: text                 // "waiting" | "selecting" | "active" | "finished"
  fen: text                    // Current board in FEN notation (chess.js format)
  turn: text                   // "white" | "black" - whose turn it is
  whitePlayerId: text          // UUID (never changes after game creation)
  whitePlayerName: text        // Display name
  blackPlayerId: text?         // UUID, null until join
  blackPlayerName: text?       // Display name, null until join

  // Impostor selection (set during "selecting" phase)
  whiteImpostorSquare: text?   // The square White chose (a BLACK pawn square)
  blackImpostorSquare: text?   // The square Black chose (a WHITE pawn square)

  // Impostor activation flags
  whiteImpostorUsed: boolean   // true once White activates their impostor
  blackImpostorUsed: boolean   // true once Black activates their impostor

  // Revealed square (set when activated OR neutralized by investigation)
  whiteImpostorRevealed: text? // destination square where White's impostor moved, OR secured square
  blackImpostorRevealed: text? // destination square where Black's impostor moved, OR secured square

  // Investigation tracking
  whiteInvestigationUsed: boolean
  blackInvestigationUsed: boolean

  // Secured pawns (correctly investigated impostors - immune to N/B)
  securedSquares: text[]       // Array of square strings, default []

  // State & events
  lastEvent: text?             // Human-readable description of the last action
  winner: text?                // "white" | "black" | "draw"
  penaltyTargetColor: text?    // "white" | "black" - set during penalty flow, else null
  moveCount: integer           // Total half-moves
  moveHistory: jsonb           // Array of { from, to, player, promotion?, moveType?, impostor? }

  createdAt: timestamp
  updatedAt: timestamp
})
```

### 4.1 Adding New Columns

If you need a new column:
1. Add it to `lib/db/src/schema/games.ts`
2. Add it to the `saveGame` `.set({...})` block in `artifacts/api-server/src/lib/gameStore.ts` — **if you forget this, your field will never persist!**
3. Add it to the `buildGameState()` return value in `artifacts/api-server/src/socket/gameSocket.ts` if the client needs it
4. Add it to the `GameState` type in `lib/api-client-react/src/generated/` if exposed to frontend
5. Run `pnpm --filter @workspace/db run push` to push schema changes

---

## 5. gameEngine.ts — Pure Logic Layer

File: `artifacts/api-server/src/lib/gameEngine.ts`

This is a **pure function module** — no I/O, no DB calls, no side effects. All functions take FEN strings (and other primitives) and return new FEN strings or validation results. **Never import gameStore or Socket.IO here.**

### 5.1 Coordinate System

```typescript
const FILES = ["a","b","c","d","e","f","g","h"];  // index 0..7
const RANKS = ["1","2","3","4","5","6","7","8"];  // index 0..7

squareToCoords("e4") -> [4, 3]  // [fileIndex, rankIndex]
coordsToSquare(4, 3) -> "e4"
```

### 5.2 Function Reference

#### `getImpostorMoves(fromSquare, moveType, impostorColor, fen?, securedSquares)`
Returns array of valid destination squares for an impostor move.

- **Knight**: Only forward L-shapes. "Forward" means:
  - White's impostor is a Black pawn, moves toward rank "1" (decreasing rank index). Check: `targetRank < rank`
  - Black's impostor is a White pawn, moves toward rank "8" (increasing rank index). Check: `targetRank > rank`

- **Bishop**: Slides diagonally only in forward directions, blocked by pieces.
  - White -> `[[-1,-1],[1,-1]]` (decreasing rank index = toward rank "1")
  - Black -> `[[-1,1],[1,1]]` (increasing rank index = toward rank "8")
  - Can capture enemy pieces (land on them), blocked by friendly pieces.

- Result is filtered to remove `securedSquares`.

#### `isValidImpostorMove(fromSquare, toSquare, moveType, fen, impostorColor, securedSquares)`
Returns `{ valid: boolean; error?: string }`. Checks:
1. Pawn still exists at `fromSquare` and is type `"p"`
2. Pawn has left its starting rank (White's impostor starts rank index 6; Black's starts rank index 1)
3. `toSquare` is not a secured square
4. `toSquare` is in valid destinations
5. `toSquare` is not occupied by own piece

#### `applyImpostorMove(fen, fromSquare, toSquare, impostorColor)`
Manually moves pawn (bypassing chess.js move rules):
1. `chess.remove(fromSquare)` — removes pawn from source
2. `chess.remove(toSquare)` — removes any piece on destination (capture)
3. `chess.put({ type: "p", color }, toSquare)` — places pawn on destination
4. Manually reconstructs FEN parts: switches turn, resets en passant to `"-"`, updates half-move clock (reset to 0 on capture, +1 otherwise), increments full-move number only if Black moved

> **CRITICAL: Never call `chess.move()` for impostor moves.** chess.js would reject them as illegal.

#### `applyStandardMove(fen, from, to, promotion?, securedSquares)`
Uses `chess.move()` normally. Validates promotion piece is one of `["q","r","b","n"]`. Blocks knight/bishop captures on secured pawns via `isSecuredPawnAttacked`. Returns `{ newFen, captured?, promotion?, error? }`.

#### `checkGameOver(fen)`
Returns `{ over: boolean; winner?: "white"|"black"|"draw" }`. Checks checkmate (winner is the player who did NOT just move, i.e., opposite of `chess.turn()`), draw, stalemate.

#### `trackImpostorPawn(fen, impostorSquare, lastMove)`
Updates the tracked square after any move:
- If `lastMove.from === impostorSquare` -> impostor pawn moved normally, update to `lastMove.to` (or `null` if promoted)
- If `lastMove.to === impostorSquare` -> impostor was captured, return `null`
- Otherwise -> unchanged

#### `trackSecuredPawns(fen, securedSquares, lastMove)`
Same pattern as above, applied to every square in `securedSquares`. Also uses `chess.get(sq)` as final check — if the piece at the secured square is no longer a pawn, removes it from secured.

#### `isImpostorCaptured(fen, impostorSquare)`
Reads FEN and returns `true` if there is no pawn at `impostorSquare`.

#### `switchFenTurn(fen, activeColor)`
Manually flips the turn in a FEN string. Used when a wrong investigation causes a turn skip without a standard chess move. Increments full-move number if Black's turn ended.

#### `applyInvestigationPenalty(fen, penalizedColor)`
**This function is DEAD CODE.** It is never called. The penalty is now interactive via the `selectPenalty` socket event. Do **not** call this function.

#### `getInitialPawnSquares(color)`
Returns squares on the starting rank for a given color that are valid impostor positions (files a, b, c, f, g, h).

#### `isValidImpostorSelection(pawnSquare, targetColor, fen)`
Validates that the chosen pawn exists on the board and belongs to `targetColor`.

---

## 6. gameStore.ts — Persistence & Cache

File: `artifacts/api-server/src/lib/gameStore.ts`

### 6.1 In-Memory Cache

```typescript
const gameCache = new Map<string, Game>();
```

- `getGame(gameId)` — checks cache first, falls back to DB
- `saveGame(game)` — **always writes to DB**, then updates cache on success
- `invalidateCache(gameId)` — removes from cache (call if you need fresh DB read)

### 6.2 Critical Rule for saveGame

`saveGame` uses an explicit `.set({...})` call listing every field it persists. **Any field NOT listed there will never be saved to DB.** If you add a new DB column, add it to the set object:

```typescript
// In saveGame(), add your new field here:
.set({
  status: game.status,
  fen: game.fen,
  // ... existing fields ...
  myNewField: game.myNewField,   // <- ADD HERE
  updatedAt: new Date(),
})
```

---

## 7. REST API Contract

File: `artifacts/api-server/src/routes/games.ts`

All routes are mounted under `/api`. Validated with `@workspace/api-zod` Zod schemas.

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/api/healthz` | — | `{ ok: true }` | Health check |
| GET | `/api/games` | — | Array of game summaries | Only `waiting` or `active` games |
| POST | `/api/games` | `{ playerName: string }` | `{ gameId, playerId, color: "white" }` | Creates game, player is White |
| GET | `/api/games/:id` | — | `GameState` | Pass `?playerId=` to get `myColor` |
| POST | `/api/games/:id/join` | `{ playerName: string }` | `{ gameId, playerId, color: "black" }` | Status must be `"waiting"`, transitions to `"selecting"` |
| POST | `/api/games/:id/impostor` | `{ playerId, pawnSquare }` | `{ success: true, bothReady: boolean }` | Status must be `"selecting"`. Also emits `gameState` via Socket.IO |

### 7.1 Player ID Storage (Frontend)

Player IDs are stored per-tab in `sessionStorage`:
- Key: `game_${gameId}_player` -> playerId UUID
- Key: `game_${gameId}_color` -> `"white"` or `"black"`

Player names are stored in `localStorage` key `"playerName"` (persisted across tabs).

---

## 8. Socket.IO Event Protocol

File: `artifacts/api-server/src/socket/gameSocket.ts`

### 8.1 Client -> Server Events

All events require `gameId` and `playerId`. The server validates:
1. Game exists
2. Game status is `"active"` (for gameplay events)
3. `penaltyTargetColor` is null (for all move/action events)
4. Player is in the game
5. It is the player's turn

#### `joinRoom`
```typescript
{ gameId: string; playerId: string }
```
Joins the Socket.IO room. Server broadcasts full `gameState` to **all sockets in the room** (not just the joiner). This ensures Player 1 wakes up when Player 2 connects.

#### `makeMove`
```typescript
{ gameId: string; playerId: string; from: string; to: string; promotion?: string }
```
- Calls `applyStandardMove` -> `trackImpostorPawn` x2 -> `trackSecuredPawns` -> `isImpostorCaptured` x2 -> `checkGameOver`
- Updates `game.turn`, `game.moveCount`, `game.lastEvent`, `game.moveHistory`
- Broadcasts full `gameState` to all room sockets

#### `activateImpostor`
```typescript
{ gameId: string; playerId: string; fromSquare: string; toSquare: string; moveType: "knight"|"bishop" }
```
- Must be player's turn; impostor not yet used; impostor still exists; `fromSquare` matches stored impostor square
- Calls `isValidImpostorMove` then `applyImpostorMove`
- Sets `xImpostorUsed = true`, `xImpostorRevealed = toSquare`, `xImpostorSquare = null`
- Pushes `{ from, to, moveType, impostor: true, player }` to `moveHistory`
- Broadcasts `gameState`

#### `investigate`
```typescript
{ gameId: string; playerId: string; suspectSquare: string }
```
- Marks investigation as used (`xInvestigationUsed = true`)
- Checks `suspectSquare === opponentImpostorSquare`:
  - **Correct**: adds square to `securedSquares`, clears opponent's `xImpostorSquare`, sets `xImpostorRevealed`
  - **Wrong**: skips turn (`switchFenTurn`), increments `moveCount`, checks for available pieces; if opponent has pieces to lose, sets `penaltyTargetColor` to investigator's color; otherwise just logs the event
- Broadcasts `gameState`

#### `selectPenalty`
```typescript
{ gameId: string; playerId: string; square: string }
```
- Only callable by the player whose color is **opposite** `penaltyTargetColor`
- Validates the chosen square has a knight or bishop belonging to the penalized player
- Removes the piece from FEN using `chess.remove(square)`, updates `game.fen`
- Clears `penaltyTargetColor`, logs event, broadcasts `gameState`

#### `resign`
```typescript
{ gameId: string; playerId: string }
```
Sets `status = "finished"`, `winner = opponent's color`, logs event, broadcasts.

### 8.2 Server -> Client Events

#### `gameState`
The canonical game state sent to every player in a room. Built by `buildGameState(game, requestingPlayerId)`.

Key: The server sends **personalized** state to each socket using a per-socket loop:
```typescript
const sockets = await io.in(gameId).fetchSockets();
for (const s of sockets) {
  s.emit("gameState", buildGameState(saved, s.data.playerId));
}
```
This ensures `myColor` and `myImpostorSquare` are correct for each player.

`buildGameState` exposes:
```typescript
{
  id, status, fen, turn,
  whitePlayerName, blackPlayerName,
  myColor,                    // "white"|"black"|null (null for spectators)
  myImpostorSquare,           // only YOUR own impostor (opponent's is hidden)
  impostorReady,              // both impostors selected
  whiteImpostorUsed, blackImpostorUsed,
  whiteImpostorRevealed, blackImpostorRevealed,
  whiteInvestigationUsed, blackInvestigationUsed,
  securedSquares,
  lastEvent, winner, penaltyTargetColor,
  moveCount,
  lastMoveFrom, lastMoveTo,   // for move highlighting (from last moveHistory entry)
}
```

**Never expose `whiteImpostorSquare`/`blackImpostorSquare` directly to clients** — those are the secrets.

#### `moveError`
```typescript
{ message: string }
```
Sent only to the offending socket when a move is rejected.

### 8.3 Socket Room & Data

- `socket.join(gameId)` — each game is its own room
- `socket.data.gameId` — the game this socket is in
- `socket.data.playerId` — the player this socket belongs to (set on `joinRoom`)

---

## 9. Frontend State Machine (Game.tsx)

File: `artifacts/deception-chess/src/pages/Game.tsx`

### 9.1 State Variables

```typescript
gameState: GameState | null          // Server-authoritative game state
playerId: string | null              // This tab's player ID (from sessionStorage)
impostorPhase: "idle"|"pickMoveType"|"pickDestination"
impostorMoveType: "knight"|"bishop"|null
impostorTargets: string[]            // Valid destination squares for current impostor move
investigateMode: boolean             // Awaiting pawn click for investigation
investigateTarget: string | null     // Square selected for investigation confirmation
investigateDialogOpen: boolean
penaltySelectionType: "knight"|"bishop"|null
selectedSquare: string | null        // Click-to-move first click
pendingPromotion: { from: string; to: string } | null
lastMove: { from: string; to: string } | null
```

### 9.2 State Authority Rules

| Data type | Source of truth |
|---|---|
| `gameState` during `waiting`/`selecting` | REST poll (every 2s) merged with socket |
| `gameState` during `active`/`finished` | Socket.IO `gameState` events |
| `playerId` | `sessionStorage` (per-tab) |
| Player name | `localStorage` |

**Merge strategy** (see `useEffect` for `initialData`):
- During `waiting`/`selecting`: merge REST data but preserve `myColor` and `myImpostorSquare` from socket state if already set
- During `active`/`finished`: socket is sole source of truth; REST is ignored

On every `gameState` socket event, all UI modes are reset to their idle defaults.

### 9.3 Board Click Handler (`handleBoardClick`)

Priority order (highest first):
1. **Penalty selection mode** (`penaltySelectionType && penaltyTargetColor`) — validate and emit `selectPenalty`
2. **Penalty pending but not choosing** — do nothing (return early)
3. **Impostor destination pick** (`impostorPhase === "pickDestination"`) — emit `activateImpostor`
4. **Investigation mode** — validate clicked pawn is own pawn, open confirmation dialog
5. **Impostor selection phase** (`status === "selecting"` and no impostor yet) — validate file/rank, call `handleSelectImpostor`
6. **Standard click-to-move** (`status === "active"`, player's turn) — two-click pattern

### 9.4 Impostor Activation UI Flow

```
[Activate Impostor button] -> impostorPhase = "pickMoveType"
[Pick Knight or Bishop] -> pickMoveType(mt)
  -> compute getImpostorTargets() client-side (mirrors server logic)
  -> impostorPhase = "pickDestination"
  -> impostorTargets = [valid squares]
[Click highlighted square] -> emit activateImpostor -> server validates -> gameState broadcast -> reset
```

The client computes `getImpostorTargets()` to show highlights. **The server always re-validates.** Client targets are for UX only.

### 9.5 Impostor Available Check

```typescript
const impostorAvailable =
  isMyTurn &&
  gameState.status === "active" &&
  !isPenaltyPending &&
  !(myColor === "white" ? whiteImpostorUsed : blackImpostorUsed) &&
  !!myImpostorSquare &&
  hasImpostorLeftStartingRank;  // not ending in "7" for white, not ending in "2" for black
```

### 9.6 Custom Square Styles Priority

Later styles override earlier (applied in this order):
1. Impostor selection candidates (red glow on enemy pawns during `selecting`)
2. My impostor pawn (red glow when idle)
3. Impostor source during activation (stronger red)
4. Impostor targets (blue)
5. Secured pawns (yellow glow)
6. Selected square (white tint)
7. Last move (amber tint) — only shown when `impostorPhase === "idle"` and `!investigateMode`
8. Investigation mode pawns (purple glow on own pawns)
9. Penalty piece targets (red highlight for specific piece type)

---

## 10. Critical Data Invariants You Must Never Break

### INV-1: Server is the only authority
Never trust client-sent data for game state mutation. Always re-read from DB/cache via `getGame()`. Always validate on the server before mutating.

### INV-2: penaltyTargetColor blocks all actions
Every socket event handler checks `if (game.penaltyTargetColor)` and rejects all actions except `selectPenalty`. Any new action you add must have this check.

### INV-3: impostorSquare is live position; Revealed is history
- `whiteImpostorSquare` = current tracked square of White's impostor (null if used, captured, or neutralized)
- `whiteImpostorRevealed` = last known square after activation or neutralization
- After activation: `Square = null`, `Used = true`, `Revealed = destination`
- After neutralization by investigation: `Square = null`, `Revealed = the secured square`
- These two fields serve different purposes — never conflate them

### INV-4: Secured squares are pawn squares that move with the pawn
`securedSquares` holds current positions of secured pawns. They are tracked via `trackSecuredPawns` after every move. If the pawn is captured or promotes, the entry is removed.

### INV-5: moveHistory is append-only
Never mutate existing entries. Always push:
```typescript
const history = (game.moveHistory as any[]) ?? [];
history.push({ from, to, player, ... });
game.moveHistory = history as any;
```

### INV-6: FEN is always valid chess.js FEN
After manually manipulating FEN parts (impostor moves, penalty removal, turn switch), verify the result is parseable with `new Chess(resultFen)`.

### INV-7: Turn field mirrors FEN
`game.turn` ("white"/"black") must always match the active player in `game.fen`. Both must be updated together after every state change.

### INV-8: moveCount counts half-moves
`moveCount` increments by 1 for every half-move: standard moves, impostor activations, and turn skips from wrong investigation. It does **not** reset.

### INV-9: buildGameState personalizes per-socket
Never broadcast the raw `game` object. Always call `buildGameState(game, playerId)` per socket to prevent leaking impostor secrets.

### INV-10: gameCache can be stale
If you modify the DB without going through `saveGame`, call `invalidateCache(gameId)`.

---

## 11. Safe Patterns for Adding New Features

### 11.1 Adding a New Socket Event (Server)

```typescript
socket.on("myNewEvent", async ({ gameId, playerId, /* your params */ }) => {
  const game = await getGame(gameId);
  if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
  if (game.status !== "active") {
    socket.emit("moveError", { message: "Game is not active" });
    socket.emit("gameState", buildGameState(game, playerId));
    return;
  }
  // MANDATORY: block while penalty is pending
  if (game.penaltyTargetColor) {
    socket.emit("moveError", { message: "Cannot act: penalty choice is pending" });
    socket.emit("gameState", buildGameState(game, playerId));
    return;
  }

  const isWhite = playerId === game.whitePlayerId;
  const isBlack = playerId === game.blackPlayerId;
  if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player" }); return; }

  const playerColor = isWhite ? "white" : "black";
  if (game.turn !== playerColor) {
    socket.emit("moveError", { message: "Not your turn" });
    socket.emit("gameState", buildGameState(game, playerId));
    return;
  }

  // --- your logic here ---
  // Use gameEngine.ts pure functions
  // Update game fields: game.turn, game.moveCount++, game.lastEvent

  const saved = await saveGame(game);
  const sockets = await io.in(gameId).fetchSockets();
  for (const s of sockets) {
    s.emit("gameState", buildGameState(saved, s.data.playerId));
  }
});
```

### 11.2 Adding a New Pure Game Engine Function

Add to `gameEngine.ts`:
- **Input**: FEN strings, square strings, color strings, primitive flags
- **Output**: New FEN string OR `{ valid: boolean; error?: string }` OR computed data
- **Only import**: `chess.js`
- Export the function and import it at the top of `gameSocket.ts`

### 11.3 Adding a New REST Endpoint

1. Add route to `artifacts/api-server/src/routes/games.ts`
2. Add Zod schema to `lib/api-zod/src/generated/` for request validation
3. Add React Query hook to `lib/api-client-react/src/` for frontend consumption
4. Rebuild `@workspace/api-zod` and `@workspace/api-client-react`

### 11.4 Adding a New UI Mode / Player Action (Frontend)

1. Add state variables at the top of `Game.tsx`
2. Add a branch to `handleBoardClick` at the **correct priority level**
3. Add a reset in the `socket.on("gameState", ...)` handler
4. Add visual indicator via `customSquareStyles`
5. Add UI controls in the "Operative Actions" card section

### 11.5 Adding a One-Time-Use Player Ability

1. Add `whiteXAbilityUsed: boolean` and `blackXAbilityUsed: boolean` columns to DB schema (default `false`)
2. Add to `saveGame`'s `.set({})`
3. Add to `buildGameState` return value
4. In socket handler: check `isWhite && game.whiteXAbilityUsed` guard before allowing
5. Set `game.whiteXAbilityUsed = true` when used
6. In frontend: check `gameState.whiteXAbilityUsed`/`blackXAbilityUsed` for availability

---

## 12. Known Gotchas & Banned Patterns

### DO NOT: Call `chess.move()` for Impostor Moves
The impostor pawn move is illegal chess. Always use `applyImpostorMove()`.

### DO NOT: Expose impostorSquare in buildGameState
```typescript
// WRONG - leaks the secret:
whiteImpostorSquare: game.whiteImpostorSquare,
blackImpostorSquare: game.blackImpostorSquare,

// CORRECT - personalized:
myImpostorSquare: isWhite ? game.whiteImpostorSquare : isBlack ? game.blackImpostorSquare : null,
```

### DO NOT: Allow Actions While penaltyTargetColor is Set
Every server socket handler must check this. The UI guards are for UX; the server guard is for security.

### DO NOT: Call `applyInvestigationPenalty()`
This function is dead code. The current flow uses the interactive `selectPenalty` event instead.

### DO NOT: Use `require()` inside Socket Handlers
The `selectPenalty` handler has a legacy `const Chess = require("chess.js").Chess` inside it. This is tech debt. Do not replicate — import at file top.

### DO NOT: Forget to broadcast after every state mutation
All socket handlers must end with the broadcast loop using `io.in(gameId).fetchSockets()`.

### CAUTION: FEN Turn vs game.turn
Both must be updated together. When you call `switchFenTurn(fen, color)`, also set `game.turn = opponentColor`. When `applyStandardMove` returns a new FEN, flip `game.turn` separately.

### CAUTION: Client-Side Impostor Target Calculation
`getImpostorTargets()` in `Game.tsx` mirrors `getImpostorMoves()` in `gameEngine.ts`. If you change the server logic, update the client calculation too or highlights will be wrong.

### CAUTION: Race Between REST and Socket During Selecting Phase
The merge logic deliberately preserves socket-delivered `myColor` and `myImpostorSquare` over REST data during `selecting`. If you add more per-player secret data, add it to the merge guard in the `useEffect` for `initialData`.

### CAUTION: d/e files Excluded from Impostor Selection
`VALID_IMPOSTOR_FILES = ["a","b","c","f","g","h"]` — excludes "d" and "e". Both the server (`isValidImpostorSelection`) and the client (`handleBoardClick`) enforce this. If you change valid files, update both.

### CAUTION: Starting Rank Detection for Impostor Activation

```typescript
// Server (gameEngine.ts):
const startingRank = impostorColor === "white" ? 6 : 1;
// White's impostor is a Black pawn -> starts at rank "7" -> index 6
// Black's impostor is a White pawn -> starts at rank "2" -> index 1

// Client (Game.tsx):
const hasImpostorLeftStartingRank =
  myImpostorSquare &&
  (myColor === "white"
    ? !myImpostorSquare.endsWith("7")   // White's impostor is a black pawn
    : !myImpostorSquare.endsWith("2")); // Black's impostor is a white pawn
```
These must stay in sync.

### CAUTION: Investigation targeting direction
When White investigates, they click one of **their own (White's) pawns** to accuse it of being Black's impostor. The `opponentImpostorSquare` for White is `game.blackImpostorSquare` (the White pawn that Black controls). Do not confuse the direction: you investigate YOUR OWN pieces for the opponent's impostor.

---

## 13. Development Commands Cheat Sheet

```bash
# Install all workspace dependencies
pnpm install

# Build everything
pnpm run build

# Type check all packages
pnpm run typecheck

# Start backend dev server
pnpm --filter @workspace/api-server run dev

# Start frontend dev server
pnpm --filter @workspace/deception-chess run dev

# Push DB schema changes to Postgres
pnpm --filter @workspace/db run push

# Force-push DB schema (destructive)
pnpm --filter @workspace/db run push-force

# Run via the PowerShell dev script (starts both concurrently)
./run-dev.ps1
```

### Environment Variables Required

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | `@workspace/db` | PostgreSQL connection string |
| `PORT` | `@workspace/api-server` | Port for HTTP/Socket.IO server |

Copy `.env.example` to `.env` and fill in values before running locally.

---

## Quick Feature Checklist

Before shipping any new feature, verify:

- [ ] Server validates the action (never trust client)
- [ ] `penaltyTargetColor` check added to new socket handlers
- [ ] `saveGame` `.set({})` includes any new DB columns
- [ ] `buildGameState` exposes new fields if client needs them (without leaking secrets)
- [ ] Client resets new UI state in the `socket.on("gameState")` handler
- [ ] `game.turn` and FEN turn field stay in sync
- [ ] `game.moveCount` incremented for all half-moves
- [ ] `game.lastEvent` set to a human-readable description
- [ ] All room sockets receive personalized `gameState` broadcast after every mutation
- [ ] New `@workspace/db` columns are pushed to DB

---

*Generated from production codebase state — June 2026.*
