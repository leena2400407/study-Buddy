// DOM Elements
const btnFeatures = document.getElementById('btn-features');
const homePage = document.getElementById('home-page');
const featuresPage = document.getElementById('features-page');
const triggerLogo = document.getElementById('trigger-logo');
const cylinderScene = document.getElementById('cylinder-scene');
const controls = document.getElementById('controls');
const CylinderElem = document.getElementById('Cylinder');
const bgEffects = document.getElementById('bg-effects');
const resourcesCard = document.getElementById('resources-card');

// State Variables
let selectedIndex = 0;
const cellCount = 6; 
let isCylinderOpen = false;

// Backgrounds and Emoji Data
const bgColors = ["#0a3622", "#2b0a3d", "#0b132b", "#310000", "#1c1c1c", "#002b36"];
const emojisDict = {
    0: ['⚽️', '🏀', '🎉', '🎆', '🎾'], 
    1: ['🧱', '🕹️', '👾', '💥'],      
    2: ['📚', '📖', '📝', '🧠'],      
    3: ['🔥', '🤝', '👯‍♂️', '⚡'],      
    4: ['🤖', '✨', '⚙️', '💬'],      
    5: ['📌', '🗒️']                  
};

// Transition from Home to Features Page
// Transition from Home to Features Page
btnFeatures.addEventListener('click', () => {
    homePage.style.display = 'none';
    featuresPage.style.display = 'flex';
    cylinderScene.style.display = 'flex'; // <-- Added this to show the 3D scene & lid!
});

// Trigger 3D Cylinder Scene
// Trigger 3D Cylinder Scene
triggerLogo.addEventListener('click', () => {
    if(isCylinderOpen) return; 
    isCylinderOpen = true;
    
    // Fade out and remove the START button
    triggerLogo.style.opacity = '0';
    
    setTimeout(() => { 
        triggerLogo.style.display = 'none'; 
        
        // Show controls and trigger the card fade-in
        controls.style.display = 'flex';
        cylinderScene.classList.add('is-open'); 
        
        // Initialize the view and start background effects
        updateCylinder();
        startEffects();
        
    }, 400); // <-- Closes the setTimeout and sets the 400ms delay
}); 

function updateCylinder() {
    if(!isCylinderOpen) return;
    
    // Calculate rotation angle
    let angle = (selectedIndex / cellCount) * -360;
    CylinderElem.style.transform = `translateZ(-600px) rotateY(${angle}deg)`;
    
    // Figure out which card is currently facing the user
    let activeIdx = ((selectedIndex % cellCount) + cellCount) % cellCount;
    
    // Pause the animated CSS gradient and apply the matching solid/radial background
    document.body.style.animation = 'none'; 
    document.body.style.background = `radial-gradient(circle at center, ${bgColors[activeIdx]} 40%, #e5e3e3 95%) center / cover no-repeat`;
}

// Navigation Listeners
document.getElementById('prev-btn').addEventListener('click', () => { 
    selectedIndex--; 
    updateCylinder(); 
});

document.getElementById('next-btn').addEventListener('click', () => { 
    selectedIndex++; 
    updateCylinder(); 
});

// Resources Card Link
resourcesCard.addEventListener('click', () => {
    window.location.href = 'pages/Links&Resources.html'; 
});

// Spawn Floating Emojis & Sticky Notes
function startEffects() {
    setInterval(() => {
        let activeIdx = ((selectedIndex % cellCount) + cellCount) % cellCount;
        let el = document.createElement('div');
        
        // If on the "Guide/Tips" card, spawn sticky notes. Otherwise, emojis.
        if (activeIdx === 5) {
            el.className = 'sticky-note';
            el.innerText = "Tip " + Math.floor(Math.random() * 100);
            el.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
        } else {
            el.className = 'floating-emoji';
            let currentEmojis = emojisDict[activeIdx];
            el.innerText = currentEmojis[Math.floor(Math.random() * currentEmojis.length)];
        }
        
        // Randomize spawn position and animation speed
        el.style.left = Math.random() * 100 + 'vw';
        el.style.animationDuration = (Math.random() * 3 + 4) + 's'; 
        
        bgEffects.appendChild(el);
        
        // Clean up elements from DOM after they float up
        setTimeout(() => { el.remove(); }, 7000);
    }, 400); 
}