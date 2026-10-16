require("dotenv").config();

const app = require("./app");
const pool = require("./config/postgres");
const connectMongoDB = require("./config/mongodb");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL connection
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");

    // Connect to MongoDB
    await connectMongoDB();

    // Start Express server only after both connections succeed
    app.listen(PORT, () => {
      console.log(`SecureCloud backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start SecureCloud:", error.message);

    await pool.end().catch(() => {});
    process.exit(1);
  }
}

startServer();