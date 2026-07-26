# codebase_memory.md - Hidden Gambit Codebase Intelligence

This document provides a comprehensive overview of the Hidden Gambit repository. It serves as a guide for engineers and developers to understand the architecture, data flow, game mechanics, and engineering design patterns of the application.

---

## 1. Project Overview

### Purpose & Business Domain
**Hidden Gambit** (also referred to as **Deception Chess**) is a multiplayer web-based chess variant featuring strategic deception and hidden information. The domain is online board games, strategy-based mind games, and social deduction.

### Target Audience
Casual and competitive chess players, strategy board game enthusiasts, and players who enjoy psychological bluffing and deducing hidden information.

### Core Features
*   **Lobby System:** Quick room creation and joining via shared invitation codes.
*   **Monorepo Architecture:** Clean boundary lines separating frontend, backend, schemas, and database modules.
*   **Impostor Pawn Mechanic:** During game setup (the `selecting` phase), each player secretly selects one of the opponent's pawns to act as a sleeper agent (their "impostor").
*   **Sleeper Abilities:** Once per game, a player can move their impostor pawn using non-pawn movements (Knight jump or Bishop slide). This activation reveals the pawn's impostor status to the opponent.
*   **Pawn Investigation:** Once per game, a player can investigate an opponent's pawn, provided the opponent has not already activated their impostor.
    *   *If correct:* The impostor pawn is neutralized and becomes a "secured pawn" (immune to Knight/Bishop captures).
    *   *If incorrect:* The investigating player faces a penalty (the opponent chooses one of their Knights or Bishops to be removed from the board).
*   **Real-time Synchronization:** Socket.IO handles bi-directional client-server state replication.

---

## 2. Repository Structure

The monorepo organizes applications under `artifacts/` and shared dependencies/libraries under `lib/` using pnpm workspaces:

```
Hidden-Gambit/
├── artifacts/
│   ├── api-server/             # Backend Express + Socket.IO server
│   │   ├── src/
│   │   │   ├── lib/            # Engine rules validation, caching, logging
│   │   │   ├── routes/         # HTTP endpoints (lobby, room entry)
│   │   │   ├── socket/         # Socket event registry & event handlers
│   │   │   └── app.ts & index.ts
│   │   └── build.mjs           # esbuild bundler configuration
│   ├── deception-chess/        # Frontend React/Vite/Tailwind client app
│   │   ├── src/
│   │   │   ├── components/     # Accessible Radix primitives and UI elements
│   │   │   ├── pages/          # Lobby, Join, and Game views
│   │   │   ├── hooks/          # React hooks (useToast, etc.)
│   │   │   └── lib/            # Socket.io connection instantiator
│   │   └── vite.config.ts      # Dev proxy and asset packaging rules
│   └── mockup-sandbox/         # Auxiliary sandbox for UI/UX testing
├── lib/
│   ├── api-client-react/       # Generated React Query hooks & fetch wrappers
│   ├── api-spec/               # OpenAPI 3.0 specs and Orval codegen configs
│   ├── api-zod/                # Generated Zod payload validation models
│   └── db/                     # Drizzle schema layouts & PostgreSQL clients
├── scripts/                    # Development automation scripts
├── .env & .env.example         # System credentials and connection URLs
├── pnpm-workspace.yaml         # Package configurations and catalog versions
└── tsconfig.base.json          # Shared compiler rules
```

---

## 3. Technology Stack

*   **Runtime:** Node.js (v22 target).
*   **Package Manager:** `pnpm` workspaces.
*   **Languages:** TypeScript (v5.9), JavaScript.
*   **Frontend UI:** React 19, TailwindCSS, Radix UI Primitives, Lucide Icons, Sonner (Toasts), Framer Motion.
*   **Chess Rendering & Rules:** `react-chessboard` (board canvas) and `chess.js` (algebraic moves validation).
*   **Backend Server:** Express.js (v5), Socket.IO (v4) for low-latency state pushes, Pino for high-performance logging.
*   **Database & ORM:** PostgreSQL database driven by Drizzle ORM and `pg` node pools.
*   **Code Generators:** Orval (compiles OpenAPI yaml specs into TanStack React-Query hooks and Zod schemas).
*   **Bundlers:** Vite (client compilation), esbuild (server module compilation).

---

## 4. Architecture

### Overall Design
Hidden Gambit uses a **Server-Authoritative Monorepo Architecture**:

```
 ┌────────────────────────────────────────────────────────┐
 │                      PNPM Workspace                    │
 └────────────────────────────────────────────────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────────┐        ┌──────────────────────┐
│  artifacts/api-server   │        │ artifacts/deception- │
│  (Express/Socket.IO)    │        │       chess (React)  │
└─────────────────────────┘        └──────────────────────┘
    │           │                              │
    │           ▼                              │
    │  ┌──────────────────┐                    │
    │  │     lib/db       │                    │
    │  │  (Postgres/      │                    │
    │  │   Drizzle ORM)   │                    │
    │  └──────────────────┘                    │
    ▼                                          ▼
┌─────────────────────────────────────────────────────────┐
│     lib/api-zod  ◀──  lib/api-spec  ──▶  api-client     │
│  (Zod Schemas)      (OpenAPI Specs)     (React Queries) │
└─────────────────────────────────────────────────────────┘
```

*   **Dependency Direction:** Shared libraries in `lib/` are fully decoupled. The applications (`artifacts/*`) import these libs. Database updates are handled directly on the backend.
*   **Contract-Driven API:** An OpenAPI spec file (`lib/api-spec/openapi.yaml`) acts as the single source of truth for the network interface. Models are compiled down to Zod types (`lib/api-zod`) and React Query hooks (`lib/api-client-react`) using Orval.

---

## 5. Execution Flow

### 1. Application Startup
*   **Database Update:** The runner executes Drizzle Kit schema push (`pnpm --filter @workspace/db run push`) to ensure Postgres tables match Drizzle models.
*   **API Server:** Bootstrapped via `artifacts/api-server/src/index.ts`. Starts HTTP and WebSocket listeners on port `5000`.
*   **Vite Dev Server:** Bootstrapped via `artifacts/deception-chess`. Listens on port `3000`. Assets / api requests are proxied from `/api/*` and `/socket.io/*` directly to `localhost:5000`.

### 2. Client Routing
*   **Router:** Frontend `wouter` monitors paths:
    *   `/` -> Renders `Lobby.tsx` (game list, operative identity, game initiation).
    *   `/join/:id` -> Renders `Join.tsx` (join lobby directly).
    *   `/game/:id` -> Renders `Game.tsx` (real-time game board).

### 3. Connection & Socket Join
*   On navigating to `/game/:id`, the client instantiates a persistent socket connection and registers to a game-specific room via the `joinRoom` Socket.IO event.

---

## 6. Data Flow

### Game State Synchronizations & Moves

```
Client (React / Game.tsx)
  │
  ├─► (REST POST) ──► /api/games/:id/impostor  ──► Set secret selection in DB
  │
  ├─► (Socket) ──────► "makeMove" ──────┐
  │                                     ▼
  │                           [Validate on Backend]
  │                           - Check turn & penalty state
  │                           - Parse through chess.js rules
  │                           - Evaluate secured pawn capture limits
  │                                     │
  │                                     ▼
  │                             [Write changes]
  │                             - Update FEN state
  │                             - Update secured/captured pawns
  │                             - Persist structure to Postgres
  │                                     │
  │                                     ▼
  │                          [Broadcast to room]
  │   ◄── (WS push) ◀────── "gameState" event ◄─┘
  │
  └─► Re-render chessboard and state trackers
```

*   **Authoritative Server:** The client has zero authority over game states. Any user actions (standard move, impostor activation, pawn investigation) are transmitted to the backend as events.
*   **State Filtering:** To prevent cheating, `buildGameState()` filters output based on request coordinates: it hides the opponent's `impostorSquare` while returning the player's own secret position.

---

## 7. Component Hierarchy (Game Screen)

*   **`Game` Container (`pages/Game.tsx`)**
    *   **`Chessboard` (`react-chessboard`)**: Receives custom square styles, dragging parameters, click coordinates, and active FEN representation.
        *   *Styling:* **Revealed Impostor Highlights** (Applies a dynamic, glowing red outline/drop-shadow on the revealed impostor piece in the UI which automatically tracks and follows the piece as it moves).
        *   *Overlay:* **Promotion Menu Dropdown** (Calculates column coordinates and overlays a choice box on the board).
        *   *Overlay:* **Lobby Waiting Screen** (Allows copying invitations and blocks board interaction).
        *   *Overlay:* **Impostor Action Banner** (Controls active setups and placement).
        *   *Overlay:* **Game Over Overlay** (Blocks play when status becomes `finished`).
    *   **Intel Report Card**: Displays player names, color assignments, a heartbeat turn status indicator, and the last event log.
    *   **Asset Status Card**: Lists impostor status ("Active", "Captured", "Neutralized", "Burned"), investigation availability, and secured pawn positions.
    *   **Operative Actions Card**: Provides quick controls to initiate/cancel impostor movement, trigger pawn investigation, or resign the match.
    *   **Dialog Modals**:
        *   *Investigation Confirmation Dialog*
        *   *Opponent Penalty Selector Dialog* (displays Knights/Bishops eligible for deletion)
        *   *Penalty Choice Pending Dialog* (blocking status for accused players)

---

## 8. Backend Engine & Socket Handlers

### Core Game Engine (`artifacts/api-server/src/lib/gameEngine.ts`)
*   **`getImpostorMoves` / `isValidImpostorMove`:** Validates non-standard pawn jumps.
    *   Knight: Moves in all directions (standard 8 L-jumps).
    *   Bishop: Slides diagonally in all directions (standard 4 diagonal slides).
    *   Crucial Constraint: Impostors cannot activate from their starting ranks (Rank 2 for Black, Rank 7 for White).
*   **`trackImpostorPawn`, `trackRevealedPiece`, & `trackSecuredPawns`:** Maps pawn and piece movements to verify if active, revealed, or secured pawns/pieces were moved, captured, or promoted.
*   **`applyStandardMove` / `applyImpostorMove`:** Mutates the board FEN position, updates en-passant states, and rotates game turns. `applyImpostorMove` converts the activated pawn to its true form (Knight or Bishop) of the player's color upon activation.
*   **`applyInvestigationPenalty` / `removePieceOfType`:** Execution flow for wrong investigations. Automatically identifies target pieces and removes them from play.

### Socket Registry (`artifacts/api-server/src/socket/gameSocket.ts`)
*   **`joinRoom`:** Binds socket instances to room channels.
*   **`makeMove`:** Handles traditional chess movements.
*   **`activateImpostor`:** Triggers the special knight/bishop action and broadcasts the revealed square.
*   **`investigate`:** Compares the selected pawn coordinate with the opponent's impostor location. Validates that the opponent's impostor has not already been activated. On correct hits, labels the pawn as secured and reveals it. On incorrect hits, shifts the game turn, triggers penalty mode, and alerts the opponent to pick a penalty.
*   **`selectPenalty`:** Removes the chosen knight/bishop and resumes standard play.
*   **`resign`:** Concedes the game, transitioning the status to `finished`.

---

## 9. Database Schema

Defined in `lib/db/src/schema/games.ts` using Drizzle pgTable structure:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `text` (PK) | Unique game identification code (e.g. `H6B2XT`) |
| `status` | `text` | Status constraint: `waiting`, `selecting`, `active`, `finished` |
| `fen` | `text` | Standard FEN board position string |
| `turn` | `text` | Turn indicator: `white` or `black` |
| `whitePlayerId` | `text` | Client identifier for White player |
| `whitePlayerName` | `text` | Screen name for White player |
| `blackPlayerId` | `text` (Null) | Client identifier for Black player |
| `blackPlayerName` | `text` (Null) | Screen name for Black player |
| `whiteImpostorSquare` | `text` (Null) | Coordinate of White's impostor (hidden from Black client) |
| `blackImpostorSquare` | `text` (Null) | Coordinate of Black's impostor (hidden from White client) |
| `whiteImpostorUsed` | `boolean` | `true` if White activated their impostor ability |
| `blackImpostorUsed` | `boolean` | `true` if Black activated their impostor ability |
| `whiteImpostorRevealed` | `text` (Null) | Destination square of White's impostor after activation |
| `blackImpostorRevealed` | `text` (Null) | Destination square of Black's impostor after activation |
| `whiteInvestigationUsed` | `boolean` | `true` if White used their investigation attempt |
| `blackInvestigationUsed` | `boolean` | `true` if Black used their investigation attempt |
| `securedSquares` | `text[]` | Array of squares containing secured pawns |
| `lastEvent` | `text` (Null) | Text describing the last executed move or ability |
| `winner` | `text` (Null) | `white`, `black`, `draw`, or `null` |
| `penaltyTargetColor` | `text` (Null) | Color of player currently facing piece removal |
| `moveCount` | `integer` | Total move count |
| `moveHistory` | `jsonb` | History of all actions for replay capability |

---

## 10. State Management

*   **Server State (Source of Truth):** Persisted in PostgreSQL database records.
*   **Active Cache Layer:** Handled by a module-level Map (`gameCache` inside `gameStore.ts`) to avoid database fetch calls for high-frequency gameplay cycles.
*   **Client Query Cache:** Managed by TanStack React Query. The game state query auto-refetches every 2 seconds during the setup phases (`waiting`/`selecting`). Once the game becomes `active`, auto-refetches stop and Socket.IO events handle all cache invalidations and state replacements.
*   **Local UI State:** Native React hooks (`useState`) track intermediate client states (e.g. piece selection, drag highlights, active overlays, dialog states).

---

## 11. API Documentation

### REST HTTP Interface

#### `GET /api/games`
*   **Description:** Retrieves all rooms currently waiting for players or actively playing.
*   **Output:** `ListGamesResponse` (Array of game room metadata objects).

#### `POST /api/games`
*   **Description:** Initiates a new game lobby.
*   **Input Body:** `CreateGameBody` (`{ playerName: string }`)
*   **Output:** `{ gameId: string, playerId: string, color: 'white' }`

#### `GET /api/games/:id`
*   **Description:** Fetches active FEN positions, player labels, and history logs. Takes an optional `playerId` query parameter to filter out the opponent's secret impostor position.
*   **Output:** `GetGameResponse`

#### `POST /api/games/:id/join`
*   **Description:** Joins an open lobby. Moves status from `waiting` to `selecting`.
*   **Input Body:** `JoinGameBody` (`{ playerName: string }`)
*   **Output:** `{ gameId: string, playerId: string, color: 'black' }`

#### `POST /api/games/:id/impostor`
*   **Description:** Submits secret pawn assignment. If both selections are ready, shifts status to `active`.
*   **Input Body:** `SetImpostorBody` (`{ playerId: string, pawnSquare: string }`)
*   **Output:** `{ success: boolean, bothReady: boolean }`

---

## 12. Session & Authentication
*   **No Accounts:** The application operates without persistent accounts, user database entries, or JWT signatures.
*   **Temporary Sessions:** Player tokens are generated as random UUIDs during join/create steps.
*   **Storage Hook:** Tokens are stored in browser-level `sessionStorage` under the key `game_${id}_player`. This confines sessions to individual browser tabs, enabling local dual-window debugging without token conflicts.

---

## 13. Build and Deployment Pipeline

### Local Development Startup
1. Copy `.env.example` to `.env` and configure `DATABASE_URL` with a valid PostgreSQL DSN.
2. Build the server environment: `pnpm install` and `pnpm run build`.
3. Startup scripts (`run-dev.ps1` or `start.ps1` on Windows):
    *   Runs `pnpm --filter @workspace/db run push` to push schema changes.
    *   Launches the Express API server on port 5000 in a background process.
    *   Launches the Vite Dev Server in the current terminal window on port 3000.

---

## 14. Coding Conventions

*   **Strict Type-Safety:** TypeScript type constraints are enforced across libraries and applications.
*   **Component Structure:** Frontend components utilize Radix primitives for accessibility, styled with Tailwind utility classes.
*   **Validation Boundaries:** Zod schemas validate payload borders across all Express endpoints.
*   **Error Reporting:** Toast notifications are used for user errors. Chess validation errors are handled via Socket.IO `moveError` channels.

---

## 15. Known Technical Debt & Risks

*   **Ephemeral Cache Dependency:** The `gameCache` inside the backend is stored in a local, single-process in-memory `Map`.
    *   *Risk:* A server restart preserves game states in the database, but active Socket.IO connections will lose synchronization until the client reloads the page.
    *   *Scalability:* The single-process cache and standard memory map prevent horizontal scaling. A Redis adapter would be required to sync memory state and sockets across multiple instances.
*   **No Disconnection Recovery:** If a client loses socket connection temporarily, there is no automatic reconnection sync logic. Players must manually refresh the page to restore board states.
*   **Security:** Player IDs act as access tokens but are not signed or encrypted. Anyone with access to the client session history or URL parameters can impersonate a player.
*   **Lack of Testing:** The codebase currently has no automated unit, integration, or end-to-end tests. Core mechanics (e.g. impostor movements, secured captures) rely on manual QA.
