const { MongoMemoryServer } = require("mongodb-memory-server");

module.exports = async function globalSetup() {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-for-automated-tests";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret-key";
  process.env.AUTO_SEED = "false";
  process.env.ENABLE_AI = "false";
  process.env.REDIS_ENABLED = "false";

  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  process.env.MONGO_URI = mongod.getUri();
};
