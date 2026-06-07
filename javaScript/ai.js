document.addEventListener("DOMContentLoaded", () => {
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
  const themeToggle = document.getElementById("themeToggle");
  const promptButtons = document.querySelectorAll(".prompt-grid button");

  if (
    !startBtn ||
    !startScreen ||
    !chatUi ||
    !chatBox ||
    !chatForm ||
    !messageInput ||
    !sendBtn ||
    !clearBtn ||
    !chatStatus ||
    !charCount ||
    !themeToggle
  ) {
    console.error("AI Chatbot error: missing required HTML element.");
    return;
  }

  const welcomeMessage =
    "I am ready. Ask me anything you want to understand, summarize, build, or prepare.";

  const chatHistory = [];
  let isOpening = false;

  initTheme();
  updateCharCount();
  updateSendState();
  initCursorGlow();

  startBtn.addEventListener("click", openChat);

  clearBtn.addEventListener("click", () => {
    chatHistory.length = 0;
    chatBox.innerHTML = "";

    if (startScreen.classList.contains("hidden")) {
      addBotMessage("Cleared. Start again.");
      messageInput.focus();
    }
  });

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("soft-mode");

    const isSoft = document.body.classList.contains("soft-mode");
    localStorage.setItem("aiChatbotTheme", isSoft ? "soft" : "dark");

    updateThemeButton();
  });

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt || "";

      openChat();

      setTimeout(() => {
        messageInput.value = prompt;
        autoResizeTextarea();
        updateCharCount();
        updateSendState();
        messageInput.focus();
      }, 650);
    });
  });

  messageInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateCharCount();
    updateSendState();
  });

  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!sendBtn.disabled) {
        chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    }
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userMessage = messageInput.value.trim();

    if (!userMessage) return;

    addUserMessage(userMessage);

    messageInput.value = "";
    autoResizeTextarea();
    updateCharCount();
    updateSendState();

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

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      typingMessage.remove();

      const reply = data.reply || "No reply received.";
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
      addBotMessage(`Something went wrong: ${error.message}`);
      console.error("AI frontend error:", error);
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  });

  function openChat() {
    if (startScreen.classList.contains("hidden")) {
      messageInput.focus();
      return;
    }

    if (isOpening) return;

    isOpening = true;
    startScreen.classList.add("leaving");

    setTimeout(() => {
      startScreen.classList.add("hidden");
      chatUi.classList.remove("hidden");
      chatUi.classList.add("visible");

      if (chatBox.children.length === 0) {
        addBotMessage(welcomeMessage);
      }

      messageInput.focus();
      isOpening = false;
    }, 720);
  }

  function setLoading(isLoading) {
    messageInput.disabled = isLoading;

    if (isLoading) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = "<span class='thinking-dot'></span>";
      chatStatus.textContent = "thinking";
    } else {
      sendBtn.textContent = "send";
      chatStatus.textContent = "online";
      updateSendState();
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

    const mark = document.createElement("div");
    mark.className = "message-mark";
    mark.textContent = "AI";

    const messageElement = document.createElement("div");
    messageElement.className = "chat-message bot";
    messageElement.innerHTML = formatReply(text);

    row.appendChild(mark);
    row.appendChild(messageElement);
    chatBox.appendChild(row);

    scrollDown();

    return row;
  }

  function addTypingMessage() {
    const row = document.createElement("div");
    row.className = "message-row bot-row";

    const mark = document.createElement("div");
    mark.className = "message-mark";
    mark.textContent = "AI";

    const messageElement = document.createElement("div");
    messageElement.className = "chat-message bot typing-message";
    messageElement.innerHTML = `
      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    row.appendChild(mark);
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

  function updateSendState() {
    const hasText = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasText || messageInput.disabled;
  }

  function scrollDown() {
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: "smooth"
    });
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("aiChatbotTheme");

    if (savedTheme === "soft") {
      document.body.classList.add("soft-mode");
    }

    updateThemeButton();
  }

  function updateThemeButton() {
    const isSoft = document.body.classList.contains("soft-mode");
    themeToggle.textContent = isSoft ? "dark mode" : "soft mode";
  }

  function initCursorGlow() {
    window.addEventListener("pointermove", (event) => {
      document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
      document.documentElement.style.setProperty("--my", `${event.clientY}px`);
    });
  }
});