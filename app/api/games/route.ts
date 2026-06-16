import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Static game data for when DB is empty
const staticGames = [
  {
    id: 'snake-game',
    name: 'Snake Classic',
    slug: 'snake-classic',
    description: 'Eat the food, grow your snake, avoid walls and yourself!',
    category: 'arcade',
    thumbnail: '🐍',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 100,
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    slug: 'memory-match',
    description: 'Test your memory by matching pairs of cards.',
    category: 'puzzle',
    thumbnail: '🧠',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 90,
  },
  {
    id: '2048',
    name: '2048',
    slug: '2048',
    description: 'Swipe to combine tiles and reach 2048!',
    category: 'puzzle',
    thumbnail: '🔢',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 85,
  },
  {
    id: 'flappy-bird',
    name: 'Flappy Bird Clone',
    slug: 'flappy-bird',
    description: 'Navigate through pipes without crashing!',
    category: 'arcade',
    thumbnail: '🐦',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 80,
  },
  {
    id: 'chess-puzzle',
    name: 'Chess Puzzle',
    slug: 'chess-puzzle',
    description: 'Solve chess puzzles to improve your skills.',
    category: 'strategy',
    thumbnail: '♟️',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 70,
  },
  {
    id: 'math-quiz',
    name: 'Math Quiz',
    slug: 'math-quiz',
    description: 'Test your arithmetic skills with timed challenges.',
    category: 'educational',
    thumbnail: '🧮',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 60,
  },
  {
    id: 'typing-trainer',
    name: 'Typing Trainer',
    slug: 'typing-trainer',
    description: 'Improve your typing speed and accuracy.',
    category: 'educational',
    thumbnail: '⌨️',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 55,
  },
  {
    id: 'tower-blocks',
    name: 'Tower Blocks',
    slug: 'tower-blocks',
    description: 'Stack blocks as high as you can without toppling.',
    category: 'arcade',
    thumbnail: '🧱',
    embedUrl: null,
    isExternal: false,
    isPlayable: true,
    popularity: 50,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'popularity';

    // Try to get games from DB
    let games;
    try {
      const where: Record<string, unknown> = {};
      if (category && category !== 'all') {
        where.category = category;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const orderBy: Record<string, string> = {};
      if (sortBy === 'popularity') orderBy.popularity = 'desc';
      else if (sortBy === 'name') orderBy.name = 'asc';
      else orderBy.createdAt = 'desc';

      games = await prisma.game.findMany({
        where,
        orderBy,
        take: 50,
      });
    } catch {
      // DB not available, use static data
      games = staticGames;
    }

    // If DB returned empty, fall back to static games
    if (!games || (Array.isArray(games) && games.length === 0)) {
      games = staticGames;
    }

    // Filter static games if needed
    if (Array.isArray(games) && !games[0]?.id?.includes('cuid')) {
      let filtered = [...games];
      if (category && category !== 'all') {
        filtered = filtered.filter(g => g.category === category);
      }
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(g =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q)
        );
      }
      if (sortBy === 'popularity') {
        filtered.sort((a, b) => b.popularity - a.popularity);
      } else if (sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
      games = filtered;
    }

    return NextResponse.json({ games, source: !Array.isArray(games) || games[0]?.id?.includes('cuid') ? 'db' : 'static' });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
