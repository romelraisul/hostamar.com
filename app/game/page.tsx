'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, Filter, Trophy, Users, Star, Zap, 
  Clock, TrendingUp, ChevronRight, X, Play, Pause, RotateCcw,
  Gamepad2, Sparkles, Medal, Crown
} from 'lucide-react';

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  thumbnail: string;
  isPlayable: boolean;
  popularity: number;
}

const categories = [
  { id: 'all', label: 'All Games', icon: Gamepad2 },
  { id: 'puzzle', label: 'Puzzle', icon: Sparkles },
  { id: 'arcade', label: 'Arcade', icon: Zap },
  { id: 'strategy', label: 'Strategy', icon: Trophy },
  { id: 'educational', label: 'Educational', icon: Medal },
];

// ============================================================================
// Snake Game Component (Working HTML5 game)
// ============================================================================
function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameRef = useRef<{ snake: {x: number, y: number}[]; food: {x: number, y: number}; direction: {x: number, y: number}; interval: NodeJS.Timeout | null }>({
    snake: [],
    food: { x: 0, y: 0 },
    direction: { x: 1, y: 0 },
    interval: null
  });

  const gridSize = 20;
  const tileCount = 20;

  const resetGame = useCallback(() => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    gameRef.current.snake = initialSnake;
    gameRef.current.direction = { x: 0, y: -1 };
    gameRef.current.food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
    setScore(0);
    setGameState('playing');
  }, []);

  const placeFood = useCallback(() => {
    let newFood: { x: number; y: number };
    do {
      newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
    } while (gameRef.current.snake.some(s => s.x === newFood.x && s.y === newFood.y));
    gameRef.current.food = newFood;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, tileCount * gridSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(tileCount * gridSize, i * gridSize);
        ctx.stroke();
      }

      // Draw food
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(
        gameRef.current.food.x * gridSize + gridSize / 2,
        gameRef.current.food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw snake
      gameRef.current.snake.forEach((segment, index) => {
        const gradient = ctx.createLinearGradient(
          segment.x * gridSize,
          segment.y * gridSize,
          segment.x * gridSize + gridSize,
          segment.y * gridSize + gridSize
        );
        if (index === 0) {
          gradient.addColorStop(0, '#22c55e');
          gradient.addColorStop(1, '#16a34a');
        } else {
          gradient.addColorStop(0, '#4ade80');
          gradient.addColorStop(1, '#22c55e');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          segment.x * gridSize + 1,
          segment.y * gridSize + 1,
          gridSize - 2,
          gridSize - 2,
          4
        );
        ctx.fill();
      });
    };

    if (gameState === 'playing') {
      draw();
    } else if (gameState === 'idle') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press SPACE or click Play to start', canvas.width / 2, canvas.height / 2);
    } else if (gameState === 'gameover') {
      draw();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    }
  }, [gameState, score]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      const { snake, food, direction } = gameRef.current;
      
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
      
      // Wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        setGameState('gameover');
        setHighScore(prev => Math.max(prev, score));
        if (gameRef.current.interval) clearInterval(gameRef.current.interval);
        return;
      }
      
      // Self collision
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        setGameState('gameover');
        setHighScore(prev => Math.max(prev, score));
        if (gameRef.current.interval) clearInterval(gameRef.current.interval);
        return;
      }
      
      const newSnake = [head, ...snake];
      
      // Food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        placeFood();
      } else {
        newSnake.pop();
      }
      
      gameRef.current.snake = newSnake;
    }, 150);

    gameRef.current.interval = gameLoop;

    return () => clearInterval(gameLoop);
  }, [gameState, score, placeFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState !== 'playing') {
        e.preventDefault();
        resetGame();
        return;
      }
      
      if (gameState !== 'playing') return;
      
      const { direction } = gameRef.current;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (direction.y !== 1) gameRef.current.direction = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (direction.y !== -1) gameRef.current.direction = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (direction.x !== 1) gameRef.current.direction = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (direction.x !== -1) gameRef.current.direction = { x: 1, y: 0 };
          break;
        case 'Escape':
          setGameState('paused');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, resetGame]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Score:</span>
          <span className="text-green-400 font-bold">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Best:</span>
          <span className="text-yellow-400 font-bold">{highScore}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border-2 border-green-500/30 rounded-lg"
      />
      <div className="flex gap-3">
        {gameState === 'idle' && (
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <Play className="w-4 h-4" /> Play
          </button>
        )}
        {gameState === 'playing' && (
          <button
            onClick={() => setGameState('paused')}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <Pause className="w-4 h-4" /> Pause
          </button>
        )}
        {gameState === 'paused' && (
          <>
            <button
              onClick={() => setGameState('playing')}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" /> Restart
            </button>
          </>
        )}
        {gameState === 'gameover' && (
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        )}
      </div>
      <p className="text-gray-500 text-xs">Use Arrow keys or WASD to move • SPACE to start • ESC to pause</p>
    </div>
  );
}

// ============================================================================
// Memory Match Game Component
// ============================================================================
function MemoryGame() {
  const emojis = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎢', '🎡', '🎠'];
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const initGame = useCallback(() => {
    const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameWon(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first] === cards[second]) {
        setMatched(m => [...m, first, second]);
        setFlipped([]);
        if (matched.length + 2 === cards.length) {
          setGameWon(true);
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">Moves: <span className="text-cyan-400 font-bold">{moves}</span></span>
        <span className="text-gray-400">Matched: <span className="text-green-400 font-bold">{matched.length / 2} / {emojis.length}</span></span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`w-16 h-16 rounded-lg text-2xl flex items-center justify-center transition-all duration-300 ${
              flipped.includes(index) || matched.includes(index)
                ? 'bg-slate-700 rotate-0'
                : 'bg-slate-800 hover:bg-slate-700'
            } ${flipped.includes(index) ? 'ring-2 ring-cyan-400' : ''}`}
          >
            {(flipped.includes(index) || matched.includes(index)) ? emoji : '?'}
          </button>
        ))}
      </div>
      {gameWon && (
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-400 mb-2">🎉 You Won!</p>
          <p className="text-gray-400">Completed in {moves} moves</p>
        </div>
      )}
      <button
        onClick={initGame}
        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 transition"
      >
        <RotateCcw className="w-4 h-4" /> New Game
      </button>
    </div>
  );
}

// ============================================================================
// 2048 Game Component
// ============================================================================
function Game2048() {
  const [grid, setGrid] = useState<number[][]>([[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = () => {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    const addRandom = (g: number[][]) => {
      const empty = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (g[i][j] === 0) empty.push({i, j});
      if (empty.length === 0) return g;
      const {i, j} = empty[Math.floor(Math.random() * empty.length)];
      g[i][j] = Math.random() < 0.9 ? 2 : 4;
      return g;
    };
    setGrid(addRandom(addRandom(newGrid)));
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => { initGame(); }, []);

  const merge = (line: number[]): { result: number[]; points: number } => {
    const filtered = line.filter(x => x !== 0);
    let points = 0;
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        points += filtered[i];
        filtered[i + 1] = 0;
      }
    }
    return { result: [...filtered.filter(x => x !== 0), 0, 0, 0].slice(0, 4), points };
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;
    let newGrid = grid.map(r => [...r]);
    let totalPoints = 0;

    const rotate = (times: number) => {
      for (let t = 0; t < times; t++) {
        newGrid = newGrid[0].map((_, i) => newGrid.map(row => row[i]).reverse());
      }
    };

    const rotations = { up: 1, down: 3, left: 0, right: 2 };
    rotate(rotations[dir]);

    for (let i = 0; i < 4; i++) {
      const { result, points } = merge([...newGrid[i]].reverse());
      newGrid[i] = result.reverse();
      totalPoints += points;
    }

    rotate((4 - rotations[dir]) % 4);

    // Check if grid changed
    const changed = JSON.stringify(grid) !== JSON.stringify(newGrid);
    if (!changed) return;

    // Add random tile
    const empty = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (newGrid[i][j] === 0) empty.push({i, j});
    if (empty.length > 0) {
      const {i, j} = empty[Math.floor(Math.random() * empty.length)];
      newGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
    }

    setGrid(newGrid);
    setScore(s => s + totalPoints);

    // Check game over
    let canMove = false;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (newGrid[i][j] === 0) canMove = true;
      if (j < 3 && newGrid[i][j] === newGrid[i][j+1]) canMove = true;
      if (i < 3 && newGrid[i][j] === newGrid[i+1][j]) canMove = true;
    }
    if (!canMove) setGameOver(true);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        move(e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const getColor = (n: number) => {
    const colors: Record<number, string> = {
      2: 'bg-amber-100 text-amber-900', 4: 'bg-amber-200 text-amber-900',
      8: 'bg-orange-400 text-white', 16: 'bg-orange-500 text-white',
      32: 'bg-red-500 text-white', 64: 'bg-red-600 text-white',
      128: 'bg-yellow-400 text-white', 256: 'bg-yellow-500 text-white',
      512: 'bg-yellow-600 text-white', 1024: 'bg-purple-500 text-white',
      2048: 'bg-purple-600 text-white',
    };
    return colors[n] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 text-sm">
        <span className="text-gray-400">Score: <span className="text-cyan-400 font-bold">{score}</span></span>
      </div>
      <div className="grid grid-cols-4 gap-1 bg-slate-700 p-1 rounded-lg">
        {grid.map((row, i) => row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            className={`w-16 h-16 rounded flex items-center justify-center font-bold text-lg ${getColor(cell)}`}
          >
            {cell || ''}
          </div>
        )))}
      </div>
      {gameOver && (
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400 mb-2">Game Over!</p>
          <p className="text-gray-400">Final Score: {score}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        <div />
        <button onClick={() => move('up')} className="p-2 bg-slate-700 rounded hover:bg-slate-600">↑</button>
        <div />
        <button onClick={() => move('left')} className="p-2 bg-slate-700 rounded hover:bg-slate-600">←</button>
        <button onClick={() => move('down')} className="p-2 bg-slate-700 rounded hover:bg-slate-600">↓</button>
        <button onClick={() => move('right')} className="p-2 bg-slate-700 rounded hover:bg-slate-600">→</button>
      </div>
      <button onClick={initGame} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold">
        New Game
      </button>
    </div>
  );
}

// ============================================================================
// Main Game Page Component
// ============================================================================
export default function GamePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        const data = await res.json();
        setGames(data.games || []);
        setFilteredGames(data.games || []);
      } catch {
        // Use static fallback
        setGames([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  useEffect(() => {
    let result = games;
    if (selectedCategory !== 'all') {
      result = result.filter(g => g.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }
    setFilteredGames(result);
  }, [selectedCategory, searchQuery, games]);

  const openGame = (gameId: string) => {
    setActiveGame(gameId);
    setShowGameModal(true);
  };

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'snake-game': return <SnakeGame />;
      case 'memory-match': return <MemoryGame />;
      case '2048': return <Game2048 />;
      default: return <SnakeGame />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Hostamar Games
          </div>
          <div className="ml-auto flex gap-4 text-sm items-center">
            <Link href="/game" className="text-green-400 font-semibold">Games</Link>
            <Link href="#leaderboard" className="text-gray-300 hover:text-white transition">Leaderboard</Link>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 10+ Games
            </span>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Play 10+ Free Games
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Puzzle, arcade, strategy, and educational games. Compete on leaderboards and track your progress!
          </p>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-4xl mx-auto">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon Banner */}
      <section className="container mx-auto px-4 pb-8">
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">
              <span className="text-purple-400 font-semibold">Tournaments</span> and <span className="text-pink-400 font-semibold">bKash payouts</span> coming soon!
            </span>
          </div>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">Coming in Weeks 10-12</span>
        </div>
      </section>

      {/* Games Grid */}
      <section className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16">
            <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No games found</p>
            <button onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }} className="mt-4 text-green-400 hover:text-green-300">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredGames.map(game => (
              <div
                key={game.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 hover:border-green-500/30 transition group cursor-pointer"
              >
                <div 
                  onClick={() => openGame(game.id)}
                  className="text-6xl mb-4 group-hover:scale-110 transition cursor-pointer"
                >
                  {game.thumbnail}
                </div>
                <h3 className="text-lg font-bold mb-2">{game.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{game.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {game.popularity} plays
                  </span>
                  <span className="capitalize px-2 py-1 bg-white/10 rounded">{game.category}</span>
                </div>
                <button
                  onClick={() => openGame(game.id)}
                  className="w-full py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Play Now
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Leaderboards</h3>
            <p className="text-gray-400 text-sm">Compete with other players and climb the global rankings</p>
            <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Multiplayer</h3>
            <p className="text-gray-400 text-sm">Play with friends in real-time matches</p>
            <span className="inline-block mt-2 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Coming Soon</span>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Medal className="w-7 h-7 text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Achievements</h3>
            <p className="text-gray-400 text-sm">Earn badges and unlock special rewards</p>
            <span className="inline-block mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Coming Soon</span>
          </div>
        </div>
      </section>

      {/* Game Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {activeGame === 'snake-game' && '🐍 Snake Classic'}
                {activeGame === 'memory-match' && '🧠 Memory Match'}
                {activeGame === '2048' && '🔢 2048'}
              </h2>
              <button
                onClick={() => setShowGameModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderActiveGame()}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Hostamar.com - Game Platform. Play responsibly.</p>
      </footer>
    </div>
  );
}
