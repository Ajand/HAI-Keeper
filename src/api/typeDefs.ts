export const typeDefs = `#graphql



  type Query {
    status: Int!
  }

  type Mutation {
    start: String!

    exitSystemCoin: String!
    exitCollateral: String!
  }

`;
