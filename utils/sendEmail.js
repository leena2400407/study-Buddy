const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in Railway Variables");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("Missing EMAIL_FROM in Railway Variables");
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  });

  if (error) {
    console.error("RESEND ERROR:", error);
    throw new Error(error.message || "Failed to send email");
  }

  return data;
}

module.exports = sendEmail;