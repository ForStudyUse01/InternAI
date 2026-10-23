const { isEnabled } = require("../../../shared/config/feature-flags");
const { sendEmail } = require("../../../shared/services/mailer.service");

const pendingJobs = [];
let processing = false;

async function processJob(job) {
  await sendEmail({ to: job.to, subject: job.subject, text: job.text, type: job.type });
}

async function flushQueue() {
  if (processing) return;
  processing = true;
  while (pendingJobs.length) {
    const job = pendingJobs.shift();
    try {
      // eslint-disable-next-line no-await-in-loop
      await processJob(job);
    } catch (err) {
      // Queue failures should not crash API requests, but a silently dropped
      // email (e.g. bad SMTP creds) should at least be visible in the logs.
      console.error(`[notifications] failed to send email to ${job.to} (${job.type}):`, err.message);
    }
  }
  processing = false;
}

function enqueueNotification(job) {
  if (!isEnabled("ENABLE_NOTIFICATIONS")) return;
  pendingJobs.push(job);
  setImmediate(flushQueue);
}

module.exports = { enqueueNotification };
