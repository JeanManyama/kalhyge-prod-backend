import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // ou un autre service
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendResetCode(email, code) {
  const mailOptions = {
    from: `"Support" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Code de réinitialisation de mot de passe',
    text: `Voici votre code de réinitialisation : ${code}`,
  };

  await transporter.sendMail(mailOptions);
}
