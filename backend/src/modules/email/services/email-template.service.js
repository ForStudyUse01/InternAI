const { BRAND_NAME, BRAND_TAGLINE, BRAND_SUPPORT_EMAIL } = require("../../../constants/brand");
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const LOGO_URL = `${CLIENT_URL.replace(/\/$/, "")}/brand/favicon-48.png`;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBrandedEmailHtml({ subject, bodyHtml, preheader = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader || subject)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px 28px;background:linear-gradient(135deg,#1f6fff 0%,#22d3ee 100%);color:#ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="44" valign="middle">
                    <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:9px;object-fit:contain;background:#ffffff;" />
                  </td>
                  <td valign="middle" style="padding-left:10px;">
                    <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.2px;">${BRAND_NAME}</p>
                    <p style="margin:4px 0 0;font-size:11px;opacity:0.92;">${BRAND_TAGLINE}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-size:14px;line-height:1.65;color:#334155;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#64748b;line-height:1.5;">
              <p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${BRAND_NAME}</p>
              <p style="margin:0;">This is an automated message from the ${BRAND_NAME} platform. Please do not reply directly to this email.</p>
              <p style="margin:10px 0 0;"><a href="${CLIENT_URL}" style="color:#1f6fff;text-decoration:none;">Visit ${BRAND_NAME} Portal</a> · <a href="mailto:${BRAND_SUPPORT_EMAIL}" style="color:#1f6fff;text-decoration:none;">Support</a></p>
              <p style="margin:10px 0 0;">© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 14px;">${escapeHtml(text)}</p>`;
}

function buildEmailFromText({ subject, text, type }) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bodyHtml = lines.map((line) => paragraph(line)).join("");
  const html = buildBrandedEmailHtml({ subject, bodyHtml, preheader: lines[0] || subject });
  return { html, text: String(text || ""), subject, type };
}

module.exports = { buildBrandedEmailHtml, buildEmailFromText, escapeHtml };
