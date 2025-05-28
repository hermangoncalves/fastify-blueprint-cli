import pino from "pino";

export const loggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
};

export const logger = pino(loggerOptions);
