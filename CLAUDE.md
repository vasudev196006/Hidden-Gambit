# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Workspace-level Commands
From the root directory:
- `pnpm install` - Install all dependencies
- `pnpm run build` - Build all packages and apps
- `pnpm run typecheck` - Run TypeScript type checking across all packages

### Individual Package Commands
Each package can be built/tested individually using pnpm filters:

**Frontend (Deception Chess):**
- `pnpm --filter @workspace/deception-chess run dev` - Start development server (requires PORT and BASE_PATH env vars)
- `pnpm --filter @workspace/deception-chess run build` - Build for production
- `pnpm --filter @workspace/deception-chess run serve` - Preview production build
- `pnpm --filter @workspace/deception-chess run typecheck` - Type check frontend

**Backend (API Server):**
- `pnpm --filter @workspace/api-server run dev` - Start API server (builds then starts)
- `pnpm --filter @workspace/api-server run build` - Build backend with esbuild
- `pnpm --filter @workspace/api-server run start` - Start built backend
- `pnpm --filter @workspace/api-server run typecheck` - Type check backend

**Database:**
- `pnpm --filter @workspace/db run push` - Push schema changes to database
- `pnpm --filter @workspace/db run push-force` - Force push schema changes

## High-Level Architecture

### Overview
Hidden Gambit is a multiplayer deception chess game built with a monorepo structure using pnpm workspaces. The architecture consists of:

1. **Frontend**: React + Vite application (`artifacts/deception-chess`)
2. **Backend**: Node.js + Express API server (`artifacts/api-server`)
3. **Shared Libraries**: 
   - API client (`lib/api-client-react`)
   - Database layer (`lib/db`)
   - API schemas/zod validation (`lib/api-zod`)
4. **Real-time Communication**: Socket.IO for bidirectional client-server communication
5. **Database**: PostgreSQL with Drizzle ORM for persistence

### Data Flow
```
Client (React) 
  ⇆ (HTTP/REST) 
API Server (Express) 
  ⇆ (Database) 
PostgreSQL
  ↖
  ⇆ (WebSocket/Socket.IO)
Client (React)
```

## Frontend Architecture

### Technology Stack
- React 18 with hooks
- Vite as build tool and dev server
- TailwindCSS for styling
- TanStack React Query for server state
- Socket.IO client for real-time communication
- Chess.js for chess logic
- React-Chessboard for board rendering
- Lucide React for icons
- Radix UI primitives for accessible components
- Zod for runtime validation
- Sonner for toast notifications

### Key Directories
- `src/components/ui/` - Reusable UI components (Radix-based)
- `src/pages/` - Page components (Game, Lobby, Join, etc.)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities and socket initialization
- `src/index.css` - Global styles and Tailwind base

### State Management
- **Server State**: Managed by React Query (game state, player info)
- **UI State**: Local React useState/useReducer (impostor phases, investigation mode)
- **Real-time Updates**: Socket.IO events update React Query cache

### Game Flow
1. Lobby: Create or join a game via HTTP API
2. Game Initialization: Fetch initial game state via REST
3. Real-time Sync: Socket.IO maintains live game state
4. Player Actions: 
   - Normal moves: Sent via Socket.IO `makeMove` event
   - Impostor placement: HTTP API call (`setImpostor`) + Socket.IO
   - Impostor activation: Socket.IO `activateImpostor` event
   - Investigation: Socket.IO `investigate` event
5. Game End: Server sends `finished` status via Socket.IO

## Backend Architecture

### Technology Stack
- Node.js with Express
- TypeScript compiled to ES Modules via esbuild
- Socket.IO v4 for WebSocket connections
- PostgreSQL database with Drizzle ORM
- Pino for structured logging
- CORS and cookie-parser middleware
- Zod for request validation

### Key Files
- `src/index.ts` - Main server entry point
- `src/routes/` - API route handlers
- `src/lib/` - Database connection, socket utilities
- `build.mjs` - ESBuild configuration for production

### API Endpoints
- `GET /api/healthz` - Health check
- `GET /api/games` - List open games
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/join` - Join existing game
- `POST /api/games/:id/impostor` - Submit impostor selection
- `POST /api/games/:id/resign` - Resign game

### WebSocket Events
**Client → Server:**
- `joinRoom` - Join a game room
- `makeMove` - Standard chess move
- `activateImpostor` - Use impostor ability
- `investigate` - Investigate opponent's pawn
- `resign` - Concede the game

**Server → Client:**
- `gameState` - Broadcast game state updates
- `moveError` - Notify of invalid moves

## Database Schema

### Core Tables (via Drizzle)
- `games` - Stores game metadata and current state
- `players` - Player information linked to games
- `moves` - History of all moves made
- `game_events` - Log of significant game events

### Key Fields in `games` table:
- `id` - Unique game identifier
- `fen` - Current board position (FEN notation)
- `status` - waiting/selecting/active/finished
- `turn` - Current player's turn (white/black)
- `whitePlayerId`/`blackPlayerId` - Linked to players table
- `whiteImpostorSquare`/`blackImpostorSquare` - Secret impostor positions
- `whiteImpostorUsed`/`blackImpostorUsed` - Whether impostor ability used
- `whiteInvestigationUsed`/`blackInvestigationUsed` - Whether investigation used
- `securedSquares` - Array of squares protected by successful investigation
- `lastMoveFrom`/`lastMoveTo` - For move highlighting
- `lastEvent` - Text description of last action
- `moveCount` - Total moves made

## Game State Synchronization

### Ownership Model
- **Server Authority**: Backend is the source of truth for all game state
- **Client Prediction**: Frontend optimistically updates UI for immediate feedback
- **State Correction**: Socket.IO `gameState` events overwrite client state

### Turn Processing
1. Player makes move → Client sends `makeMove` via Socket.IO
2. Server validates move against chess rules and game state
3. If valid: Updates board, increments move count, switches turn
4. Server broadcasts updated `gameState` to all clients in room
5. Clients update local state and re-render board

### Impostor Mechanics
1. During `selecting` phase: Players choose impostor square via HTTP API
2. After both players submit: Game transitions to `active` status
3. During `active` phase: Players can activate impostor once per game
4. Impostor activation: 
   - Player selects move type (knight/bishop)
   - Selects destination square from valid targets
   - Server validates and executes special move
   - Ability marked as used

### Investigation Mechanics
1. During active game: Players can investigate once per game
2. Player highlights own rank (rank 2 for white, rank 7 for black)
3. Clicking a square triggers investigation request
4. Server checks if square contains opponent's impostor:
   - Correct: Pawn becomes secured (immune to knight/bishop)
   - Incorrect: Player loses knight and bishop pieces immediately

## Environment Variables

### Required for Frontend (`artifacts/deception-chess`):
- `PORT` - Port for Vite dev server
- `BASE_PATH` - Base URL path for asset loading

### Required for Backend (`artifacts/api-server`):
- Implicitly uses DATABASE_URL from `.env` file
- Port configured in code (5000) for Socket.IO
- Proxy target in Vite config points to localhost:5000

### Environment Setup
Copy `.env.example` to `.env` and configure:
```
# Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Optional: Node environment
NODE_ENV=development
```

## Development Workflow

### Starting Development Environment
1. Copy `.env.example` to `.env` and fill in database credentials
2. Start database (PostgreSQL) if not running
3. In one terminal: `pnpm --filter @workspace/api-server run dev`
4. In another terminal: `pnpm --filter @workspace/deception-chess run dev`
5. Frontend will proxy API requests to backend automatically

### Running Tests
Currently no test suite is implemented. Development relies on:
- Manual testing via browser
- TypeScript compiler for type safety
- Linting via Prettier (configured but not enforced in scripts)

### Code Quality
- Formatting: Prettier (version 3.8.3)
- Type Checking: TypeScript (~5.9.3)
- Linting: Not configured in package.json (consider adding ESLint)

## Key Development Patterns

### Component Organization
- UI components in `src/components/ui/` follow Radix primitives pattern
- Components are composable and accessible by default
- Styling uses Tailwind utility classes with cva/variants for variants

### Data Fetching
- React Query handles caching, deduplication, and background updates
- Query keys are array-based for precise invalidation
- Mutation functions encapsulate HTTP/WebSocket logic

### Error Handling
- Toast notifications via `useToast` hook for user feedback
- Socket.IO `moveError` events for move validation errors
- HTTP errors handled by custom fetch with proper error types

### Real-time Communication
- Socket.IO connection managed in `src/lib/socket.ts`
- Automatic reconnection handling
- Event listeners cleaned up in useEffect cleanup functions

### Game Logic Separation
- Chess logic delegated to chess.js library
- Game-specific rules (impostor, investigation) in Game.tsx
- Validation primarily happens on server for security

## Directory Structure Summary
```
Hidden-Gambit/
├── artifacts/
│   ├── api-server/          # Backend Express server
│   │   ├── src/             # TypeScript source
│   │   └── build.mjs        # ESBuild config
│   ├── deception-chess/     # Frontend React/Vite app
│   │   ├── src/             # Source code
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── pages/       # Page components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── lib/         # Utilities (socket, etc.)
│   │   ├── vite.config.ts   # Vite configuration
│   │   └── package.json     # Frontend dependencies/scripts
│   └── ...                  # Other apps (mockup-sandbox, etc.)
├── lib/
│   ├── api-client-react/    # Generated API client + custom fetch
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod schemas for validation
│   └── db/                  # Database layer with Drizzle ORM
├── scripts/                 # Utility scripts
├── package.json             # Workspace root (pnpm config)
├── pnpm-lock.yaml           # Lockfile
└── pnpm-workspace.yaml      # Workspace configuration
```

## Common Debugging Techniques

### Frontend
1. React DevTools for component inspection
2. React Query Devtools (consider adding @tanstack/react-query-devtools)
3. Socket.IO client debugging in browser dev tools Network tab
4. Console.log in event handlers for debugging game flow

### Backend
1. Check server logs (pino formatted JSON)
2. Monitor Socket.IO connections/rooms
3. Verify database state with SQL queries
4. Test API endpoints directly with curl or Postman

### Database
1. Use Drizzle Studio: `pnpm --filter @workspace/db run studio` (if configured)
2. Direct SQL queries against PostgreSQL
3. Check migration files in drizzle folder (if using migrations)

## Making Changes

### Adding New Features
1. **Backend-first approach**: Implement API endpoints and database changes
2. **Update shared packages**: Modify api-client-react if needed
3. **Frontend integration**: Use new API endpoints via React Query
4. **Real-time features**: Add Socket.IO event handlers on both client and server
5. **State synchronization**: Ensure server remains authority, client predicts optimistically

### UI Changes
1. Reuse existing components from `src/components/ui/` when possible
2. Follow Tailwind CSS patterns used throughout codebase
3. Ensure accessibility (components already use Radix primitives)
4. Test responsive behavior (mobile-first breakpoints)

### Database Changes
1. Modify schema in `lib/db/src/schema/`
2. Generate migrations if using drizzle-kit migration mode
3. Push changes with `pnpm --filter @workspace/db run push`
4. Update Drizzle types and regenerate client if needed
5. Update API routes to use new schema fields

## Known Limitations & Considerations

### Current Implementation Notes
1. **No persistent user accounts**: Players identified by temporary IDs in sessionStorage
2. **Limited error recovery**: Network interruptions may require page refresh
3. **No game history persistence**: Completed games not accessible after refresh
4. **Client-side validation limited**: Critical validation happens server-side
5. **Scalability**: Single server instance; horizontal scaling would require Redis adapter for Socket.IO

### Areas for Improvement
1. Add comprehensive test suite (unit, integration, e2e)
2. Implement proper authentication and user profiles
3. Add game history and replay functionality
4. Improve error handling and reconnection UX
5. Add rate limiting and input validation enhancements
6. Consider optimistic updates for smoother UX
7. Add observability (metrics, tracing, better logging)