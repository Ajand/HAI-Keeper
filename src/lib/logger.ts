import pino from "pino";
const { ecsFormat } = require("@elastic/ecs-pino-format");

const logLevel = process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : 30;
// Create a Pino logger instance

export const getLogger = (KeeperFromAddress: string) => {
  const logger = pino(
    {
      KeeperFromAddress,
      level: logLevel,
      ...ecsFormat({
        formatters: {
          // @ts-ignore
          level: (label) => {
            return { level: label.toUpperCase() };
          },
        },
      }),
    },
    pino.destination(`/app/logs/${KeeperFromAddress}.log`)
  );

  return logger;
};
