const crypto = require("crypto");

function generateOtp(length = 6) {
  let otp = "";
  for (let i = 0; i < length; i += 1) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

module.exports = { generateOtp, hashOtp };
