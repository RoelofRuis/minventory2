import { reactive } from 'vue';

export interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
}

export const logs = reactive<LogEntry[]>([]);

export function clearLogs() {
  logs.length = 0;
}

const MAX_LOGS = 100;

function addLog(type: LogEntry['type'], args: any[]) {
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  logs.unshift({
    type,
    message,
    timestamp: new Date()
  });

  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;
const originalDebug = console.debug;

export function initLogger() {
  console.log = (...args) => {
    addLog('log', args);
    originalLog.apply(console, args);
  };
  console.error = (...args) => {
    addLog('error', args);
    originalError.apply(console, args);
  };
  console.warn = (...args) => {
    addLog('warn', args);
    originalWarn.apply(console, args);
  };
  console.info = (...args) => {
    addLog('info', args);
    originalInfo.apply(console, args);
  };
  console.debug = (...args) => {
    addLog('debug', args);
    originalDebug.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    addLog('error', [event.error || event.message]);
  });

  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', ['Unhandled Rejection:', event.reason]);
  });
}
