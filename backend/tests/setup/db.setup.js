require("./jest.setup");

const mongoose = require("mongoose");

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  // Index creation is async/background by default — without waiting for it,
  // uniqueness constraints (e.g. User.email, User.verificationTokenHash)
  // aren't reliably enforced yet on the very first inserts of a test file,
  // which makes constraint-violation assertions flaky.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 30000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
