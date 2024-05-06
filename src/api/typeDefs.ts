export const typeDefs = `#graphql



  type Query {
    status: Int!
  }

  type Mutation {
    start: String!
    stop: String!

    exitSystemCoin: String!
    exitCollateral: String!
  }

`;
