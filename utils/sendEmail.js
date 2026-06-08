const getBrevoApiKey = () => {
  return String(process.env.BREVO_API_KEY || "").trim();
};

const getBrevoSenderEmail = () => {
  return String(process.env.BREVO_SENDER_EMAIL || "").trim();
};

const getBrevoSenderName = () => {
  return String(process.env.BREVO_SENDER_NAME || "Study Buddy").trim();
};

const normalizeRecipients = (to) => {
  const list = Array.isArray(to)
    ? to
    : String(to || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

  return list
    .map((item) => {
      if (typeof item === "string") {
        return {
          email: item.trim()
        };
      }

      return {
        email: String(item.email || "").trim(),
        name: item.name ? String(item.name).trim() : undefined
      };
    })
    .filter((item) => item.email);
};

async function sendEmail({ to, subject, html, text }) {
  const apiKey = getBrevoApiKey();
  const senderEmail = getBrevoSenderEmail();
  const senderName = getBrevoSenderName();

  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY in Railway Variables");
  }

  if (!senderEmail) {
    throw new Error("Missing BREVO_SENDER_EMAIL in Railway Variables");
  }

  const recipients = normalizeRecipients(to);

  if (recipients.length === 0) {
    throw new Error("Missing email recipient");
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: recipients,
    subject: subject || "Study Buddy Notification"
  };

  if (html) {
    payload.htmlContent = html;
  }

  if (text) {
    payload.textContent = text;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  let result;
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    result = raw;
  }

  if (!response.ok) {
    console.error("BREVO ERROR:", result);

    throw new Error(
      typeof result === "object" && result.message
        ? result.message
        : `Brevo failed with status ${response.status}`
    );
  }

  console.log("BREVO EMAIL SENT:", result.messageId || subject);
  return result;
}

module.exports = sendEmail;