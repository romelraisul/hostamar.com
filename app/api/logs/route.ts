import { NextRequest, NextResponse } from 'next/server';
import { getLogFiles, readLogFile, searchLogs } from '@/lib/logger';
import type { LogLevel } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const level = searchParams.get('level') as LogLevel | null;
  const date = searchParams.get('date');
  const query = searchParams.get('q');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    if (action === 'files') {
      const files = getLogFiles();
      return NextResponse.json({ files });
    }

    if (query) {
      const results = searchLogs(query, level || undefined, startDate || undefined, endDate || undefined);
      const start = (page - 1) * limit;
      const paginated = results.slice(start, start + limit);
      return NextResponse.json({
        logs: paginated,
        total: results.length,
        page,
        limit,
        totalPages: Math.ceil(results.length / limit),
      });
    }

    if (level && date) {
      const logs = readLogFile(level, date);
      const start = (page - 1) * limit;
      const paginated = logs.slice(start, start + limit);
      return NextResponse.json({
        logs: paginated,
        total: logs.length,
        page,
        limit,
        totalPages: Math.ceil(logs.length / limit),
      });
    }

    const allLogs: Array<{ timestamp: string; level: string; message: string; service?: string; data?: Record<string, unknown> }> = [];
    const files = getLogFiles();

    for (const file of files) {
      const match = file.match(/^(info|warn|error)-(\d{4}-\d{2}-\d{2})\.log$/);
      if (!match) continue;

      const fileLevel = match[1] as LogLevel;
      const fileDate = match[2];

      if (level && fileLevel !== level) continue;
      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;

      const entries = readLogFile(fileLevel, fileDate);
      allLogs.push(...entries);
    }

    allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const start = (page - 1) * limit;
    const paginated = allLogs.slice(start, start + limit);

    return NextResponse.json({
      logs: paginated,
      total: allLogs.length,
      page,
      limit,
      totalPages: Math.ceil(allLogs.length / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read logs' },
      { status: 500 }
    );
  }
}
