require("dotenv").config();

const { httpServer } = require("./app");
const pool = require("./config/postgres");
const connectMongoDB = require("./config/mongodb");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");

    await connectMongoDB();
    console.log("MongoDB connected successfully");

    httpServer.listen(PORT, () => {
      console.log(`SecureCloud backend running on port ${PORT}`);
      console.log(`SOAP WSDL: http://localhost:${PORT}/soap?wsdl`);
      console.log(`GraphQL: http://localhost:${PORT}/api/v1/graphql`);
    });
  } catch (error) {
    console.error("Failed to start SecureCloud:", error.message);

    await pool.end().catch(() => {});
    process.exit(1);
  }
}

startServer();