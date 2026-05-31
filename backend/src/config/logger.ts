import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
      return `${timestamp} ${level}: ${message}${metaText}`;
    })
  ),
  transports: [new winston.transports.Console()],
});
