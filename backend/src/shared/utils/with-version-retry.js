const AppError = require("./AppError");

/**
 * Wraps a load->mutate->save cycle on a Mongoose document and retries once
 * if a concurrent write already advanced the document's version (__v).
 * Mongoose's default optimistic concurrency already throws VersionError on a
 * stale save; this just turns that into a bounded retry + a clean 409
 * instead of an unhandled 500.
 */
async function withVersionRetry(loadAndMutate, { retries = 1 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await loadAndMutate();
    } catch (err) {
      if (err.name === "VersionError" && attempt < retries) continue;
      if (err.name === "VersionError") {
        throw new AppError("This application was just updated by someone else. Please retry.", 409);
      }
      throw err;
    }
  }
}

module.exports = { withVersionRetry };
