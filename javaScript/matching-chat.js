const chatId = window.CHAT_PAGE_DATA && window.CHAT_PAGE_DATA.chatId;

const messagesBox = document.getElementById("messagesBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const schedulePanel = document.getElementById("schedulePanel");
const scheduleDateTime = document.getElementById("scheduleDateTime");

let currentUserId = "";
let lastMessagesJSON = "";
let currentRequest = null;

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
    currentRequest = data.request || null;

    const messages = Array.isArray(data.messages) ? data.messages : [];
    const requestInfo = currentRequest ? JSON.stringify(currentRequest) : "";
    const newMessagesJSON = JSON.stringify(messages) + requestInfo;

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

  let statusHTML = "";

  if (currentRequest && currentRequest.scheduledAt && !currentRequest.emailSentAt) {
    statusHTML = `
      <div class="meeting-status-card">
        <strong>Meeting Scheduled</strong>
        <p>Email will be sent at ${escapeHTML(formatFullDate(currentRequest.scheduledAt))}.</p>
      </div>
    `;
  }

  if (currentRequest && currentRequest.emailSentAt) {
    statusHTML = `
      <div class="meeting-status-card sent">
        <strong>Meeting Link Sent</strong>
        <p>The meeting email was sent to both students.</p>
      </div>
    `;
  }

  if (!messages.length) {
    messagesBox.innerHTML = `
      ${statusHTML}
      <div class="empty-chat">
        No messages yet. Start the conversation.
      </div>
    `;
    return;
  }

  messagesBox.innerHTML = `
    ${statusHTML}
    ${messages.map(message => {
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
    }).join("")}
  `;

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

function showSchedulePanel() {
  if (!schedulePanel) return;

  if (scheduleDateTime) {
    scheduleDateTime.removeAttribute("min");
  }

  schedulePanel.classList.remove("hidden");
}

function hideSchedulePanel() {
  if (!schedulePanel) return;

  schedulePanel.classList.add("hidden");
}

async function submitSchedule() {
  if (!chatId || !scheduleDateTime) return;

  if (!scheduleDateTime.value) {
    alert("Please choose a meeting date and time.");
    return;
  }

  const selectedDate = new Date(scheduleDateTime.value);

  if (Number.isNaN(selectedDate.getTime())) {
    alert("Invalid date and time.");
    return;
  }

  try {
    const response = await fetch(`/api/matching/chat/${chatId}/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scheduledAt: selectedDate.toISOString()
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "Could not schedule meeting.");
      return;
    }

    alert(data.message || "Meeting scheduled.");

    hideSchedulePanel();

    scheduleDateTime.value = "";

    await loadMessages();

  } catch (error) {
    console.error("Schedule error:", error);
    alert("Server error while scheduling meeting.");
  }
}

async function matchNow() {
  if (!chatId) return;

  const confirmStart = confirm("Send the meeting link email to both students now?");

  if (!confirmStart) {
    return;
  }

  try {
    const response = await fetch(`/api/matching/chat/${chatId}/match-now`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      alert(data.message || "Could not start match now.");
      return;
    }

    alert(data.message || "Meeting email sent.");

    await loadMessages();

  } catch (error) {
    console.error("Match now error:", error);
    alert("Server error while starting match now.");
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

function formatFullDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
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