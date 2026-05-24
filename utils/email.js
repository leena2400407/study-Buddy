const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendSignupEmail = async ({ to, fullName }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email was not sent because EMAIL_USER or EMAIL_PASS is missing.");
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${process.env.EMAIL_USER}>`,
    to,
    subject: "Thank you for signing up to Study Buddy",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>Welcome to Study Buddy!</h2>
        <p>Hi ${fullName},</p>
        <p>Thank you for signing up to Study Buddy.</p>
        <p>You can now log in and start using your account.</p>
        <p>Best regards,<br>Study Buddy Team</p>
      </div>
    `
  });
};

module.exports = {
  sendSignupEmail
};