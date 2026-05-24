const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const chatUi = document.getElementById('chatUi');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

const suggestions = ['Algorithms', 'C++ Basics', 'Data Structures', 'Exam Tips', 'Code Help'];
const welcomeMessage = "🎓 Hey! I'm Study Buddy AI, your personal learning companion. What's on your mind?";

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    chatUi.classList.remove('hidden');
    typeBotMessage(welcomeMessage);
    setTimeout(showSuggestions, 1500);
    messageInput.focus();
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    typeUserMessage(userMessage);
    messageInput.value = '';
    removeSuggestions();

    setTimeout(() => {
        const reply = generateReply(userMessage);
        typeBotMessage(reply);
        setTimeout(showSuggestions, 1500);
    }, 600);
});

function typeUserMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message user';
    chatBox.appendChild(messageElement);

    const words = text.split(' ');
    let i = 0;
    const interval = setInterval(() => {
        if (i >= words.length) return clearInterval(interval);
        messageElement.textContent += (i ? ' ' : '') + words[i++];
        scrollDown();
    }, 35);
}

function typeBotMessage(text) {
    const row = document.createElement('div');
    row.className = 'bot-message-row';

    const avatar = document.createElement('img');
    avatar.className = 'bot-avatar';
    avatar.src = '../assests/images/WhatsApp_Image_2026-03-19_at_11.23.23_PM-removebg-preview.png';

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message bot';

    row.appendChild(avatar);
    row.appendChild(messageElement);
    chatBox.appendChild(row);

    const words = text.split(' ');
    let i = 0;
    const interval = setInterval(() => {
        if (i >= words.length) return clearInterval(interval);
        messageElement.textContent += (i ? ' ' : '') + words[i++];
        scrollDown();
    }, 50);
}

function generateReply(input) {
    const lower = input.toLowerCase();

    const replies = {
        algorithm: ['🔄 Algorithms:\n- Sorting: Quick/Merge/Bubble\n- Searching: Binary/Linear\n- Complexity: O(n), O(log n)\n\n💡 Ask me: "How does binary search work?"'],
        'c++': ['⚙️ C++ Essentials:\n- STL: Vectors, Maps, Sets\n- Pointers: * and &\n- OOP: Classes & Inheritance\n\n🎯 Try: "Explain pointers"'],
        data: ['📊 Data Structures:\n- Arrays, Linked Lists\n- Stacks, Queues\n- Trees, Graphs, Hash Tables\n\n✨ Ask: "Difference between array and linked list?"'],
        exam: ['🔥 Exam Success:\n1️⃣ Active recall practice\n2️⃣ Spaced repetition\n3️⃣ Time management\n4️⃣ Sleep well!\n\n💪 You got this!'],
        hello: ['👋 Welcome back! Ready to level up? 🚀\n\n📚 Topics: Algorithms, C++, Data Structures, or DSA?'],
        help: ['🆘 I can help with:\n✅ Explanations\n✅ Examples\n✅ Tips & Tricks\n✅ Problem Solving\n\nWhat would you like?'],
        recursi: ['🔁 Recursion Basics:\n- Base case (stop condition)\n- Recursive case (call itself)\n- Stack: Each call uses memory\n\nExample: Factorial, Fibonacci'],
        sort: ['🔀 Sorting Algorithms:\n- Bubble: Simple, O(n²)\n- Quick: Fast, O(n log n)\n- Merge: Stable, O(n log n)\n\n🎮 Which one interests you?']
    };

    for (const [key, msgs] of Object.entries(replies)) {
        if (lower.includes(key)) {
            return msgs[Math.floor(Math.random() * msgs.length)];
        }
    }

    return '🎓 Tell me more!\n\nTopics: Algorithms, C++, Data Structures, Recursion, Sorting, Exams, or ask anything!';
}

function showSuggestions() {
    if (document.getElementById('suggestionsBox')) return;
    
    const sugBox = document.createElement('div');
    sugBox.id = 'suggestionsBox';
    sugBox.className = 'suggestions-box';
    
    suggestions.forEach(sug => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = sug;
        btn.onclick = () => {
            messageInput.value = sug;
            chatForm.dispatchEvent(new Event('submit'));
        };
        sugBox.appendChild(btn);
    });
    
    chatBox.appendChild(sugBox);
    scrollDown();
}

function removeSuggestions() {
    const sugBox = document.getElementById('suggestionsBox');
    if (sugBox) sugBox.remove();
}

function scrollDown() {
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}