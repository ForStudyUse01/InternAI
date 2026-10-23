require("dotenv").config();

const connectDB = require("./shared/database/db");
const { seedDatabase } = require("./shared/data/seedDatabase");

async function runSeed() {
  await connectDB();
  await seedDatabase({ reset: true });
  // eslint-disable-next-line no-console
  console.log("Seed completed successfully.");
  process.exit(0);
}

runSeed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed", error);
  process.exit(1);
});
