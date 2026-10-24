const express = require("express");
const { graphql } = require("graphql");
const schema = require("./schema");
const { createResolvers } = require("./resolvers");
const authMiddleware = require("../middleware/authMiddleware");
const sendError = require("../utils/errorResponse");

const router = express.Router();

router.use(authMiddleware);

router.post("/", async (req, res, next) => {
  try {
    const { query, variables, operationName } = req.body || {};

    if (typeof query !== "string") {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "A GraphQL query string is required"
      );
    }

    const result = await graphql({
      schema,
      source: query,
      rootValue: createResolvers(req.user),
      variableValues: variables,
      operationName,
    });

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;