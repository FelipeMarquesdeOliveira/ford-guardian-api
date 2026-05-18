const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    const safeMeta = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key !== 'password' && key !== 'token' && key !== 'secret' &&
          key !== 'authorization' && key !== 'cookie') {
        if (typeof value === 'object') {
          safeMeta[key] = '[OBJECT]';
        } else {
          safeMeta[key] = value;
        }
      } else {
        safeMeta[key] = '[REDACTED]';
      }
    }

    const metaStr = Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '';
    msg += metaStr ? ` ${metaStr}` : '';

    if (stack) {
      msg += `\nStack: ${stack}`;
    }

    return msg;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

module.exports = logger;