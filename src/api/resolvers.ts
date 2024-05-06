import Keeper from "../Keeper";
export const resolversFactory = (keeper: Keeper) => {
  return {
    Query: {
      status: () => {
        return keeper.status;
      },
    },
    Mutation: {
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
