# Game MVP — Sprint backlog

## Epic
Build a playable game with real-time scoreboard and basic matchmaking.

## Sprint 1 tasks (5 days)

### [GAME-1] Design & API spec (0.5d)
- Define data model: Game, GameSession, Score
- Document REST + WebSocket endpoints in an API spec
- **Acceptance**: spec reviewed, endpoints documented

### [GAME-2] Server skeleton (0.5d)
- Express/Next API routes or small FastAPI service
- Health endpoint, CORS, basic middleware
- **Acceptance**: `GET /api/games/health` returns 200

### [GAME-3] Game logic — TicTacToe (1.5d)
- Board state management, move validation, win/draw detection
- Session lifecycle: create, join, move, end
- **Acceptance**: two players can complete a game; winner detected

### [GAME-4] Realtime — WebSocket/SSE (1d)
- Live scoreboard updates
- Move broadcasting to connected clients
- **Acceptance**: moves appear on opponent's screen without refresh

### [GAME-5] DB migrations (0.5d)
- Create Game, GameSession, Score tables
- Migration file in prisma/migrations/
- **Acceptance**: `npx prisma migrate deploy` passes clean

### [GAME-6] Frontend (0.5d)
- Minimal UI: create game, play board, scoreboard
- Reuse existing auth/layout patterns
- **Acceptance**: user can create and play a game from the browser

### [GAME-7] Tests + CI (0.5d)
- Unit tests for game logic (win detection, moves)
- E2E smoke: `scripts/test-e2e-game.sh`
- **Acceptance**: CI passes, E2E green
