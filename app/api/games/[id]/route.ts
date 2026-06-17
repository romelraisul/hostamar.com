import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const staticGames: Record<string, { id: string; name: string; slug: string; description: string; category: string; thumbnail: string; embedUrl: string | null; isPlayable: boolean; popularity: number }> = {
  'snake-game': { id: 'snake-game', name: 'Snake Classic', slug: 'snake-classic', description: 'Eat the food, grow your snake, avoid walls and yourself!', category: 'arcade', thumbnail: '🐍', embedUrl: null, isPlayable: true, popularity: 100 },
  'memory-match': { id: 'memory-match', name: 'Memory Match', slug: 'memory-match', description: 'Test your memory by matching pairs of cards.', category: 'puzzle', thumbnail: '🧠', embedUrl: null, isPlayable: true, popularity: 90 },
  '2048': { id: '2048', name: '2048', slug: '2048', description: 'Swipe to combine tiles and reach 2048!', category: 'puzzle', thumbnail: '🔢', embedUrl: null, isPlayable: true, popularity: 85 },
  'flappy-bird': { id: 'flappy-bird', name: 'Flappy Bird Clone', slug: 'flappy-bird', description: 'Navigate through pipes without crashing!', category: 'arcade', thumbnail: '🐦', embedUrl: null, isPlayable: true, popularity: 80 },
  'chess-puzzle': { id: 'chess-puzzle', name: 'Chess Puzzle', slug: 'chess-puzzle', description: 'Solve chess puzzles to improve your skills.', category: 'strategy', thumbnail: '♟️', embedUrl: null, isPlayable: true, popularity: 70 },
  'math-quiz': { id: 'math-quiz', name: 'Math Quiz', slug: 'math-quiz', description: 'Test your arithmetic skills with timed challenges.', category: 'educational', thumbnail: '🧮', embedUrl: null, isPlayable: true, popularity: 60 },
  'typing-trainer': { id: 'typing-trainer', name: 'Typing Trainer', slug: 'typing-trainer', description: 'Improve your typing speed and accuracy.', category: 'educational', thumbnail: '⌨️', embedUrl: null, isPlayable: true, popularity: 55 },
  'tower-blocks': { id: 'tower-blocks', name: 'Tower Blocks', slug: 'tower-blocks', description: 'Stack blocks as high as you can without toppling.', category: 'arcade', thumbnail: '🧱', embedUrl: null, isPlayable: true, popularity: 50 },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try DB first
    let game;
    try {
      game = await prisma.game.findUnique({
        where: { id },
      });
    } catch {
      // DB not available
    }

    // Fall back to static
    if (!game) {
      game = staticGames[id] || Object.values(staticGames).find(g => g.slug === id);
    }

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get top scores if available
    let topScores: { score: number; customerId: string }[] = [];
    try {
      topScores = await prisma.gameScore.findMany({
        where: { gameId: id },
        orderBy: { score: 'desc' },
        take: 10,
        select: { score: true, customerId: true },
      });
    } catch {
      // DB not available for scores
    }

    return NextResponse.json({ game, topScores });
  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
