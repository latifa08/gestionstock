const nodemailer = require("nodemailer");
const env = require("../.env");

const auth = env.SMTP_USER
  ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
  : undefined;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth,
});

async function sendResetEmail(toEmail, token) {
  const resetLink = `${env.APP_BASE_URL}/reset-password?token=${token}`;

  console.log("[mailer] Connecting to SMTP:", env.SMTP_HOST, "port", env.SMTP_PORT);
  console.log("[mailer] From:", env.SMTP_FROM, "→ To:", toEmail);
  console.log("[mailer] Auth:", env.SMTP_USER ? `user=${env.SMTP_USER}` : "none (no auth)");

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: toEmail,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Ce lien expire dans 1 heure et ne peut être utilisé qu'une seule fois.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `,
  });

  console.log("[mailer] Accepted:", info.accepted);
  console.log("[mailer] Message ID:", info.messageId);
}

module.exports = { sendResetEmail };
