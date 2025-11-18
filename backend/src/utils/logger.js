const levels = ['debug', 'info', 'warn', 'error'];

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (!meta) return base;
  if (meta instanceof Error) {
    return `${base} :: ${meta.stack || meta.message}`;
  }
  if (typeof meta === 'object') {
    return `${base} :: ${JSON.stringify(meta)}`;
  }
  return `${base} :: ${meta}`;
};

const logger = levels.reduce((acc, level) => {
  acc[level] = (message, meta) => {
    const formatted = formatMessage(level, message, meta);
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  };
  return acc;
}, {});

module.exports = logger;
