const { sendEmail } = require("../../../shared/services/mailer.service");
const { NOTIFICATION_TYPES } = require("../../../constants/notification-types");
const { VALIDATION_RULES } = require("../../../constants/validation-rules");
const { BRAND_NAME } = require("../../../shared/constants/brand");

async function sendOtpEmail({ to, otp }) {
  const subject = `${BRAND_NAME} OTP Verification`;
  const text = `Your verification code is ${otp}. It expires in ${VALIDATION_RULES.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`;

  return sendEmail({ to, subject, text, type: NOTIFICATION_TYPES.OTP });
}

module.exports = { sendOtpEmail };
