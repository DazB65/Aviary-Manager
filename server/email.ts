import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // In development without SMTP configured, log to console
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "Aviary Manager <noreply@aviarymanager.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[Email] VERIFY EMAIL for ${email}: ${verifyUrl}`);
    return;
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: email,
    subject: "Verify your Aviary Manager account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0d9488; margin-bottom: 8px;">Welcome to Aviary Manager! 🐦</h2>
        <p style="color: #374151; margin-bottom: 24px;">
          Thanks for signing up. Please verify your email address to activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #0d9488; color: white; padding: 12px 28px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Verify Email Address
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
          Or copy this link: ${verifyUrl}
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[Email] RESET PASSWORD for ${email}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your Aviary Manager password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0d9488; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #374151; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #0d9488; color: white; padding: 12px 28px;
                  border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });
}
