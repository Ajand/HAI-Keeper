import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { typeDefs } from "./typeDefs";
import { resolversFactory } from "./resolvers";
import Keeper from "../Keeper";

export const startAPI = async (keeper: Keeper) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers: resolversFactory(keeper),
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4545 },
  });
};
