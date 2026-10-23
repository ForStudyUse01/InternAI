const nodemailer = require("nodemailer");

let cachedTransporter = null;

function buildTransporter() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  return cachedTransporter;
}

module.exports = buildTransporter;
