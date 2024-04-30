import Keeper from "../Keeper";
export const resolversFactory = (keeper: Keeper) => {
  return {
    Query: {},
    Mutation: {
      exitSystemCoin: async () => {
        await keeper.exitSystemCoin();
      },
    },
  };
};
