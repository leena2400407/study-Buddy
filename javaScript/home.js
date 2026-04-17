const btnFeatures = document.getElementById('btn-features');
const homePage = document.getElementById('home-page');
const featuresPage = document.getElementById('features-page');
const triggerLogo = document.getElementById('trigger-logo');
const cylinderScene = document.getElementById('cylinder-scene');
const controls = document.getElementById('controls');
const CylinderElem = document.getElementById('Cylinder');
const bgEffects = document.getElementById('bg-effects');
const resourcesCard = document.getElementById('resources-card');
const events = document.getElementById('event');
const guid = document.getElementById('guid');
const eduGAte = document.getElementById('btn-edugate');


let selectedIndex = 0;
const cellCount = 6; 
let isCylinderOpen = false;

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
if (btnFeatures) {
    btnFeatures.addEventListener('click', () => {
        homePage.style.display = 'none';
        featuresPage.style.display = 'flex';
        cylinderScene.style.display = 'flex'; // <-- Added this to show the 3D scene & lid!
    });
}


// Trigger 3D Cylinder Scene
if (triggerLogo) {
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
} 

function updateCylinder() {
    if(!isCylinderOpen) return;
    
    // Calculate rotation angle
    let angle = (selectedIndex / cellCount) * -360;
    CylinderElem.style.transform = `translateZ(-600px) rotateY(${angle}deg)`;
    
    // Figure out which card is currently facing the user
    let activeIdx = ((selectedIndex % cellCount) + cellCount) % cellCount;

    // Only allow interaction on the active face
    document.querySelectorAll('.Cylinder__cell').forEach((cell, idx) => {
        if (idx === activeIdx) {
            cell.classList.add('is-active');
        } else {
            cell.classList.remove('is-active');
        }
    });
    
    // Pause the animated CSS gradient and apply the matching solid/radial background
    document.body.style.animation = 'none'; 
    document.body.style.background = `radial-gradient(circle at center, ${bgColors[activeIdx]} 40%, #e5e3e3 95%) center / cover no-repeat`;
}

// Navigation Listeners
if (document.getElementById('prev-btn')) {
    document.getElementById('prev-btn').addEventListener('click', () => { 
        selectedIndex--; 
        updateCylinder(); 
    });
}

document.addEventListener('keydown', (event) => { 
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectedIndex--;
        updateCylinder();
    }
    if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectedIndex++;
        updateCylinder();
    }
});

if (document.getElementById('next-btn')) {
    document.getElementById('next-btn').addEventListener('click', () => { 
        selectedIndex++; 
        updateCylinder(); 
    });
}

// Resources Card Link
if (resourcesCard) {
    resourcesCard.addEventListener('click', () => {
        window.location.href = 'Links&Resources.html'; 
    });
}

if (events) {
    events.addEventListener('click', () => {
        window.location.href = 'Events.html'; 
    });
}

if (guid) {
    guid.addEventListener('click', () => {
        window.location.href = 'FreshmanGuid.html'; 
    });
}

if (eduGAte) {
    eduGAte.addEventListener('click', () => {
        window.location.href = 'pages/eduGAte.html'; 
    });
}

// Spawn Floating Emojis & Sticky Notes
function startEffects() {
    if (!bgEffects) return;
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
window.addEventListener('DOMContentLoaded', () => {
    
    if (window.location.hash === '#cylinder') {
        
    
        if (homePage) homePage.style.display = 'none';
        if (featuresPage) featuresPage.style.display = 'flex';
        
        isCylinderOpen = true;
        if (triggerLogo) triggerLogo.style.display = 'none'; 
        
        if (cylinderScene) {
            cylinderScene.style.display = 'flex';
            cylinderScene.classList.add('is-open'); // <-- CRITICAL: This makes the cards pop out!
        }
        
        if (controls) controls.style.display = 'flex';
        
        updateCylinder();
        startEffects();
    }
});
function goHome() {
    // 1. Hide the features section
    if (document.getElementById('features-page')) {
        document.getElementById('features-page').style.display = 'none';
    }
    
    // 2. Show the home section (use 'block' or 'flex' depending on your CSS)
    if (document.getElementById('home-page')) {
        document.getElementById('home-page').style.display = 'block';
    }
    
    // 3. Optional: Reset the URL hash
    window.location.hash = 'home-page';
}
// Toggle the dropdown visibility
function toggleDropdown() {
    const dropdown = document.getElementById("myDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

// Function to return to the landing page
function goHome() {
    document.getElementById('features-page').style.display = 'none';
    document.getElementById('home-page').style.display = 'block';
}

// Function to navigate to specific cells
function scrollToCell(cellId) {
    const targetCell = document.getElementById(cellId);
    if (targetCell) {
        // Close dropdown after click
        document.getElementById("myDropdown").style.display = "none";
        
        // Logic to rotate your 3D cylinder would go here
        // For now, we will highlight the cell
        targetCell.style.boxShadow = "0 0 20px #fff";
        setTimeout(() => targetCell.style.boxShadow = "none", 2000);
        
        console.log("Navigating to: " + cellId);
    }
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.style.display === "block") {
                openDropdown.style.display = "none";
            }
        }
    }
}