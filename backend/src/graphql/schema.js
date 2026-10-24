const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type File {
    id: ID!
    original_name: String!
    mime_type: String
    size_bytes: Int!
    checksum: String
    created_at: String
  }

  type Query {
    myFiles(limit: Int = 10): [File!]!
    myFile(id: ID!): File
  }
`);

module.exports = schema;