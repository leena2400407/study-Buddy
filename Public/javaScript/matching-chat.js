const chatId = window.CHAT_PAGE_DATA && window.CHAT_PAGE_DATA.chatId;

const messagesBox = document.getElementById("messagesBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

let currentUserId = "";
let lastMessagesJSON = "";

async function loadMessages() {
  if (!chatId || !messagesBox) return;

  try {
    const response = await fetch(`/api/matching/chat/${chatId}/messages`, {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      messagesBox.innerHTML = `
        <div class="empty-chat">
          ${escapeHTML(data.message || "Could not load messages.")}
        </div>
      `;
      return;
    }

    currentUserId = data.currentUserId || "";

    const messages = Array.isArray(data.messages) ? data.messages : [];
    const newMessagesJSON = JSON.stringify(messages);

    if (newMessagesJSON === lastMessagesJSON) {
      return;
    }

    lastMessagesJSON = newMessagesJSON;

    renderMessages(messages);

  } catch (error) {
    console.error("Load messages error:", error);

    messagesBox.innerHTML = `
      <div class="empty-chat">
        Server error while loading messages.
      </div>
    `;
  }
}

function renderMessages(messages) {
  if (!messagesBox) return;

  if (!messages.length) {
    messagesBox.innerHTML = `
      <div class="empty-chat">
        No messages yet. Start the conversation.
      </div>
    `;
    return;
  }

  messagesBox.innerHTML = messages.map(message => {
    const isMine = String(message.sender) === String(currentUserId);

    return `
      <div class="message-row ${isMine ? "mine" : "theirs"}">
        <div class="message-bubble">
          <div class="message-name">
            ${escapeHTML(message.senderName || "Student")}
          </div>

          <div class="message-text">
            ${escapeHTML(message.text || "")}
          </div>

          <div class="message-time">
            ${formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    `;
  }).join("");

  messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function sendMessage(event) {
  event.preventDefault();

  if (!chatId || !messageInput) return;

  const text = messageInput.value.trim();

  if (!text) return;

  messageInput.disabled = true;

  try {
    const response = await fetch(`/api/matching/chat/${chatId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "Could not send message.");
      return;
    }

    messageInput.value = "";
    await loadMessages();

  } catch (error) {
    console.error("Send message error:", error);
    alert("Server error while sending message.");
  } finally {
    messageInput.disabled = false;
    messageInput.focus();
  }
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (chatForm) {
  chatForm.addEventListener("submit", sendMessage);
}

document.addEventListener("DOMContentLoaded", () => {
  loadMessages();

  setInterval(() => {
    loadMessages();
  }, 3000);
});