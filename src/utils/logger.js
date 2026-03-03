const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Set current log level (can be changed via environment variable)
const CURRENT_LEVEL = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO;

function timestamp() {
  return new Date().toISOString();
}

function log(level, levelName, ...args) {
  if (level >= CURRENT_LEVEL) {
    const prefix = `[${timestamp()}] [${levelName}]`;
    if (level === LOG_LEVELS.ERROR) {
      console.error(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }
}

module.exports = {
  debug: (...args) => log(LOG_LEVELS.DEBUG, 'DEBUG', ...args),
  info: (...args) => log(LOG_LEVELS.INFO, 'INFO', ...args),
  warn: (...args) => log(LOG_LEVELS.WARN, 'WARN', ...args),
  error: (...args) => log(LOG_LEVELS.ERROR, 'ERROR', ...args),
  setLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) CURRENT_LEVEL = LOG_LEVELS[level];
  },
};