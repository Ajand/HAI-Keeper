import Keeper from "../Keeper";
export const resolversFactory = (keeper: Keeper) => {
  return {
    Query: {
      status: () => {
        return keeper.status;
      },
    },
    Mutation: {
      start: async () => {
        await keeper.start();
        return "done";
      },

      stop: async () => {
        await keeper.shutdown();
        return "done";
      },

      exitSystemCoin: async () => {
        await keeper.exitSystemCoin();
        return "done";
      },

      exitCollateral: async () => {
        await keeper.exitCollateral();
        return "done";
      },
    },
  };
};
