const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const chatUi = document.getElementById("chatUi");
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const chatStatus = document.getElementById("chatStatus");
const charCount = document.getElementById("charCount");

const welcomeMessage = "Hey, I'm Study Buddy AI. Ask me anything.";
const chatHistory = [];

startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  chatUi.classList.remove("hidden");

  if (chatBox.children.length === 0) {
    addBotMessage(welcomeMessage);
  }

  messageInput.focus();
});

clearBtn.addEventListener("click", () => {
  chatHistory.length = 0;
  chatBox.innerHTML = "";

  if (startScreen.classList.contains("hidden")) {
    addBotMessage("Chat cleared. Ask me anything new.");
    messageInput.focus();
  }
});

messageInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateCharCount();
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userMessage = messageInput.value.trim();

  if (!userMessage) {
    return;
  }

  addUserMessage(userMessage);

  messageInput.value = "";
  autoResizeTextarea();
  updateCharCount();

  setLoading(true);

  const typingMessage = addTypingMessage();

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gemini request failed.");
    }

    typingMessage.remove();

    const reply = data.reply || "Gemini did not send a reply.";
    addBotMessage(reply);

    chatHistory.push({
      role: "user",
      text: userMessage
    });

    chatHistory.push({
      role: "model",
      text: reply
    });

    while (chatHistory.length > 12) {
      chatHistory.shift();
    }
  } catch (error) {
    typingMessage.remove();
    addBotMessage(`⚠️ ${error.message}`);
    console.error("AI frontend error:", error);
  } finally {
    setLoading(false);
    messageInput.focus();
  }
});

function setLoading(isLoading) {
  messageInput.disabled = isLoading;
  sendBtn.disabled = isLoading;

  if (isLoading) {
    sendBtn.innerHTML = "<span>Wait</span><span>…</span>";
    chatStatus.textContent = "Thinking...";
  } else {
    sendBtn.innerHTML = "<span>Send</span><span>➜</span>";
    chatStatus.textContent = "Online • Ask me anything";
  }
}

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user-row";

  const messageElement = document.createElement("div");
  messageElement.className = "chat-message user";
  messageElement.textContent = text;

  row.appendChild(messageElement);
  chatBox.appendChild(row);

  scrollDown();
}

function addBotMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "bot-avatar-small";
  avatar.textContent = "✦";

  const messageElement = document.createElement("div");
  messageElement.className = "chat-message bot";
  messageElement.innerHTML = formatReply(text);

  row.appendChild(avatar);
  row.appendChild(messageElement);
  chatBox.appendChild(row);

  scrollDown();

  return row;
}

function addTypingMessage() {
  const row = document.createElement("div");
  row.className = "message-row bot-row";

  const avatar = document.createElement("div");
  avatar.className = "bot-avatar-small";
  avatar.textContent = "✦";

  const messageElement = document.createElement("div");
  messageElement.className = "chat-message bot";
  messageElement.innerHTML = `
    <div class="typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(messageElement);
  chatBox.appendChild(row);

  scrollDown();

  return row;
}

function formatReply(text) {
  let safe = escapeHtml(String(text));

  safe = safe.replace(/```([\s\S]*?)```/g, function (_, code) {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\n{2,}/g, "</p><p>");
  safe = safe.replace(/\n/g, "<br>");

  return `<p>${safe}</p>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function updateCharCount() {
  const count = messageInput.value.length;
  charCount.textContent = `${count} character${count === 1 ? "" : "s"}`;
}

function scrollDown() {
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth"
  });
}

updateCharCount();