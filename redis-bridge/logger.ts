/**
 * Minimal logger used by the ws/redis bridge. Avoids extra deps in this container.
 */
export class Logger {
  constructor(private namespace: string) {}
  info(msg: string, meta?: unknown) {
    console.log(`[${this.namespace}] ${msg}`, meta ? JSON.stringify(meta) : '')
  }
  warn(msg: string, meta?: unknown) {
    console.warn(`[${this.namespace}] ${msg}`, meta ? JSON.stringify(meta) : '')
  }
  error(msg: string, meta?: unknown) {
    console.error(`[${this.namespace}] ${msg}`, meta ? JSON.stringify(meta) : '')
  }
}
