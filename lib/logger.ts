import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  data?: Record<string, unknown>;
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFilePath(level: LogLevel): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `${level}-${date}.log`);
}

function rotateIfNeeded(level: LogLevel) {
  const filePath = getLogFilePath(level);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_LOG_SIZE) {
      const rotatedPath = filePath.replace(/\.log$/, `-${Date.now()}.log`);
      fs.renameSync(filePath, rotatedPath);
    }
  }
}

function writeLog(entry: LogEntry) {
  ensureLogDir();
  rotateIfNeeded(entry.level);
  const filePath = getLogFilePath(entry.level);
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(filePath, line);
}

export const logger = {
  info(message: string, data?: Record<string, unknown>, service?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...(service && { service }),
      ...(data && { data }),
    };
    writeLog(entry);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },

  warn(message: string, data?: Record<string, unknown>, service?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...(service && { service }),
      ...(data && { data }),
    };
    writeLog(entry);
    console.warn(`[WARN] ${message}`, data || '');
  },

  error(message: string, data?: Record<string, unknown>, service?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(service && { service }),
      ...(data && { data }),
    };
    writeLog(entry);
    console.error(`[ERROR] ${message}`, data || '');
  },
};

export function getLogFiles(): string[] {
  ensureLogDir();
  return fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log')).sort().reverse();
}

export function readLogFile(level: LogLevel, date: string): LogEntry[] {
  const filePath = path.join(LOG_DIR, `${level}-${date}.log`);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is LogEntry => entry !== null);
}

export function searchLogs(query: string, level?: LogLevel, startDate?: string, endDate?: string): LogEntry[] {
  ensureLogDir();
  const files = getLogFiles();
  const results: LogEntry[] = [];

  for (const file of files) {
    const match = file.match(/^(info|warn|error)-(\d{4}-\d{2}-\d{2})\.log$/);
    if (!match) continue;

    const fileLevel = match[1] as LogLevel;
    const fileDate = match[2];

    if (level && fileLevel !== level) continue;
    if (startDate && fileDate < startDate) continue;
    if (endDate && fileDate > endDate) continue;

    const entries = readLogFile(fileLevel, fileDate);
    for (const entry of entries) {
      if (
        entry.message.toLowerCase().includes(query.toLowerCase()) ||
        (entry.data && JSON.stringify(entry.data).toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push(entry);
      }
    }
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
