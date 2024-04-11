import pino from "pino";
const { ecsFormat } = require("@elastic/ecs-pino-format");

const logLevel = process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : 30;
// Create a Pino logger instance

export const getLogger = (keeperAddress: string) => {
  const logger = pino(
    {
      keeperAddress,
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
    pino.destination("../../logs/server.log")
  );

  return logger;
};

const logger = pino(
  {
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
  pino.destination("../../logs/server.log")
);

export default logger;
