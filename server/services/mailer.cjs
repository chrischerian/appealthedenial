const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "AppealTheDenial <noreply@appealthedenial.com>";

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({ service: "gmail", auth: { user: EMAIL_USER, pass: EMAIL_PASS } })
  : null;

/**
 * Send email. If transporter not configured, logs to console (dev mode).
 * @param {string}  to
 * @param {string}  subject
 * @param {string}  body       plain text
 * @param {string}  [attachment] appeal letter text — attached as .txt file
 */
async function sendEmail(to, subject, body, attachment) {
  if (transporter) {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text: body,
      attachments: attachment
        ? [{ filename: "appeal-letter.txt", content: attachment }]
        : [],
    });
    console.log(`[EMAIL] Sent → ${to} — "${subject}"`);
  } else {
    const line = "─".repeat(60);
    console.log(`\n${line}`);
    console.log("[EMAIL LOG] (configure EMAIL_USER + EMAIL_PASS to send for real)");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    if (attachment) console.log(`\nAttachment: appeal-letter.txt (${attachment.length} chars)`);
    console.log(`${line}\n`);
  }
}

module.exports = { sendEmail };
