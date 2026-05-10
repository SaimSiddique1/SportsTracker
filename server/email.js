const nodemailer = require("nodemailer");

const requiredSmtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

const isEmailConfigured = () =>
  requiredSmtpKeys.every((key) => Boolean(process.env[key]));

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  if (!isEmailConfigured()) {
    const error = new Error(
      "Password reset email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in server/.env."
    );
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || "Sports Tracker";
  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: `${appName} password reset`,
    text: [
      `We received a request to reset your ${appName} password.`,
      "",
      "Use this link to choose a new password:",
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">${appName} password reset</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 16px;text-decoration:none;font-weight:700">
            Reset password
          </a>
        </p>
        <p>Or paste this link into your browser:</p>
        <p style="word-break:break-all">${resetUrl}</p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
};
