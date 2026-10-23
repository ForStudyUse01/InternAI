const buildTransporter = require("../config/mailer");
const { buildEmailFromText } = require("../../modules/email/services/email-template.service");
const AppError = require("../utils/AppError");
const logger = require("../logger");

async function sendEmail({ to, subject, text, type }) {
  const transporter = buildTransporter();

  if (!transporter) {
    logger.error("Email not sent: EMAIL_USER/EMAIL_PASS are not configured", { to, subject });
    throw new AppError(
      process.env.NODE_ENV === "production"
        ? "Email service is not configured. Contact support."
        : "Email service is not configured: set EMAIL_USER and EMAIL_PASS (Gmail address + App Password) in backend/.env to send email via Gmail SMTP.",
      503
    );
  }

  const branded = buildEmailFromText({ subject, text, type });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: branded.html,
      text: branded.text
    });
    logger.info("Email sent via Gmail SMTP", { to, subject });
    return { delivered: true };
  } catch (error) {
    logger.error("Gmail SMTP email delivery failed", { to, subject, error: error?.message });
    throw new AppError(
      process.env.NODE_ENV === "production"
        ? "Unable to send email. Please try again later."
        : `Gmail SMTP email delivery failed: ${error?.message || "unknown error"}`,
      503
    );
  }
}

module.exports = { sendEmail };
