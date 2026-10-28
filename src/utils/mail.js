const nodemailer = require('nodemailer');
require('dotenv').config();

// Em dev sem SMTP: apenas loga o link no console. Nunca exponha o token na API.
async function sendResetEmail(to, resetUrl) {
  if (!process.env.SMTP_HOST) {
    console.log(`[dev] Link de redefinição para ${to}: ${resetUrl}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Glassy PM — Redefinir sua senha',
    text: `Você pediu para redefinir sua senha. Use este link (válido por 1 hora): ${resetUrl}\nSe não foi você, ignore este e-mail.`,
    html: `<p>Você pediu para redefinir sua senha.</p><p><a href="${resetUrl}">Redefinir senha</a> (válido por 1 hora)</p><p>Se não foi você, ignore este e-mail.</p>`,
  });
}
module.exports = { sendResetEmail };
