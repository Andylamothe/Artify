export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogEntry {
  level: LogLevel
  tag: string
  message: string
  timestamp: number
}

class AudioLoggerImpl {
  private readonly entries: LogEntry[] = []

  log(level: LogLevel, tag: string, message: string): void {
    const entry: LogEntry = { level, tag, message, timestamp: Date.now() }
    this.entries.push(entry)
    if (process.env.NODE_ENV !== 'production') {
      const prefix = `[${tag}]`
      switch (level) {
        case 'ERROR': console.error(prefix, message); break
        case 'WARN':  console.warn(prefix, message);  break
        case 'DEBUG': console.debug(prefix, message); break
        default:      console.log(prefix, message);   break
      }
    }
  }

  exportJSON(): LogEntry[] {
    return [...this.entries]
  }

  clear(): void {
    this.entries.length = 0
  }
}

export const audioLogger = new AudioLoggerImpl()
