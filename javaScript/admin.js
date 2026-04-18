
const exampleData = {
    events: [
        { category: "sports", title: "University Football Cup 2026", desc: "Registration open for 5-a-side teams", img: "../assests/images/football.avif" }
    ],
    resources: [
        { category: "academic", title: "Your Comprehensive Guide to CS", desc: "YouTube playlist for Computer Science", link: "https://www.youtube.com/@DesoukiEgypt" }
    ],
    guides: [
        { category: "freshman", title: "Welcome to College", desc: "Starting college can feel overwhelming, but everyone is new like you.", img: "../assests/images/orientation.avif" }
    ],
    ai: [
        { category: "chatbot", title: "Study Buddy AI Chatbot", desc: "AI-powered study assistant for answering questions", link: "ai.html" }
    ],
    edugate: [
        { category: "courses", title: "Misr International University (MIU)", desc: "Overview of MIU: faculties, partnerships, student life", img: "../assests/images/miu.avif" }
    ],
    games: [
        { category: "puzzle", title: "Block Puzzle", desc: "Fun block puzzle game with scoring and leaderboard", link: "Game.html" }
    ]
};

// Load or initialize data from localStorage (front-end only)
let adminData = localStorage.getItem('cylinderAdminData');

if (!adminData) {
    // First time - load with examples
    adminData = JSON.parse(JSON.stringify(exampleData));
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
} else {
    adminData = JSON.parse(adminData);
    // Ensure all sections exist
    if (!adminData.events) adminData.events = [];
    if (!adminData.resources) adminData.resources = [];
    if (!adminData.guides) adminData.guides = [];
    if (!adminData.ai) adminData.ai = [];
    if (!adminData.edugate) adminData.edugate = [];
    if (!adminData.games) adminData.games = [];
}

// Navigation switching
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function() {
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        const target = this.id.replace('nav-', 'view-');
        document.querySelectorAll('.workspace').forEach(w => w.classList.remove('active'));
        document.getElementById(target).classList.add('active');
    });
});

// Toggle form visibility
function toggleForm(id) {
    const form = document.getElementById(id);
    form.style.display = form.style.display === "flex" ? "none" : "flex";
    if (form.style.display === "flex") {
        const firstInput = form.querySelector('input');
        if (firstInput) firstInput.focus();
    }
}

// Reset to example (ONE example per tab)
function resetToExample(section) {
    if(confirm(`Reset ${section} to example? This will remove all current items and add the example.`)) {
        adminData[section] = JSON.parse(JSON.stringify(exampleData[section]));
        localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
        
        // Re-render the specific table
        if(section === 'events') renderEventsTable();
        else if(section === 'resources') renderResourcesTable();
        else if(section === 'guides') renderGuidesTable();
        else if(section === 'ai') renderAITable();
        else if(section === 'edugate') renderEduGateTable();
        else if(section === 'games') renderGamesTable();
        
        alert(`✅ ${section} reset to example!`);
    }
}

// SAVE FUNCTIONS
function saveEvent() {
    const category = document.getElementById('ev-category').value;
    const title = document.getElementById('ev-title').value.trim();
    const desc = document.getElementById('ev-desc').value.trim();
    const img = document.getElementById('ev-img').value.trim() || "../assests/images/default.avif";

    if (!title || !desc) {
        alert("Please provide an Event Title and Description.");
        return;
    }

    adminData.events.push({ category, title, desc, img });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('ev-title').value = "";
    document.getElementById('ev-desc').value = "";
    document.getElementById('ev-img').value = "";
    toggleForm('form-events');
    renderEventsTable();
}

function saveResource() {
    const category = document.getElementById('res-category').value;
    const title = document.getElementById('res-title').value.trim();
    const desc = document.getElementById('res-desc').value.trim();
    const link = document.getElementById('res-link').value.trim();

    if (!title || !desc || !link) {
        alert("Please provide all fields.");
        return;
    }

    adminData.resources.push({ category, title, desc, link });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('res-title').value = "";
    document.getElementById('res-desc').value = "";
    document.getElementById('res-link').value = "";
    toggleForm('form-resources');
    renderResourcesTable();
}

function saveGuide() 
{
    const category = document.getElementById('guide-category').value;
    const title = document.getElementById('guide-title').value.trim();
    const desc = document.getElementById('guide-desc').value.trim();
    const img = document.getElementById('guide-img').value.trim() || "../assests/images/default.avif";

    if (!title || !desc) 
        {
        alert("Please provide all fields.");
        return;
    }

    adminData.guides.push({ category, title, desc, img });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('guide-title').value = "";
    document.getElementById('guide-desc').value = "";
    document.getElementById('guide-img').value = "";
    toggleForm('form-guides');
    renderGuidesTable();
}

function saveAI() {
    const category = document.getElementById('ai-category').value;
    const title = document.getElementById('ai-title').value.trim();
    const desc = document.getElementById('ai-desc').value.trim();
    const link = document.getElementById('ai-link').value.trim();

    if (!title || !desc || !link) {
        alert("Please provide all fields.");
        return;
    }

    adminData.ai.push({ category, title, desc, link });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('ai-title').value = "";
    document.getElementById('ai-desc').value = "";
    document.getElementById('ai-link').value = "";
    toggleForm('form-ai');
    renderAITable();
}

function saveEduGate() {
    const category = document.getElementById('edugate-category').value;
    const title = document.getElementById('edugate-title').value.trim();
    const desc = document.getElementById('edugate-desc').value.trim();
    const img = document.getElementById('edugate-img').value.trim() || "../assests/images/default.avif";

    if (!title || !desc) {
        alert("Please provide all fields.");
        return;
    }

    adminData.edugate.push({ category, title, desc, img });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('edugate-title').value = "";
    document.getElementById('edugate-desc').value = "";
    document.getElementById('edugate-img').value = "";
    toggleForm('form-edugate');
    renderEduGateTable();
}

function saveGame() {
    const category = document.getElementById('game-category').value;
    const title = document.getElementById('game-title').value.trim();
    const desc = document.getElementById('game-desc').value.trim();
    const link = document.getElementById('game-link').value.trim();

    if (!title || !desc || !link) {
        alert("Please provide all fields.");
        return;
    }
   

    adminData.games.push({ category, title, desc, link });
    localStorage.setItem('cylinderAdminData', JSON.stringify(adminData));
    
    document.getElementById('game-title').value = "";
    document.getElementById('game-desc').value = "";
    document.getElementById('game-link').value = "";
    toggleForm('form-games');
    renderGamesTable();
}