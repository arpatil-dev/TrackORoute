// logger.js

const COLORS = {
  reset: "\x1b[0m",
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  },
};

const logger = {
  foreground: (msg) =>
    console.log(`${COLORS.fg.cyan}[FOREGROUND] ${msg}${COLORS.reset}`),

  background: (msg) =>
    console.log(`${COLORS.bg.black}${COLORS.fg.white}[BACKGROUND] ${msg}${COLORS.reset}`),

  success: (msg) =>
    console.log(`${COLORS.fg.green}[SUCCESS] ${msg}${COLORS.reset}`),

  warn: (msg) =>
    console.log(`${COLORS.fg.yellow}[WARN] ${msg}${COLORS.reset}`),

  error: (msg) =>
    console.log(`${COLORS.fg.red}[ERROR] ${msg}${COLORS.reset}`),
};

export default logger;
