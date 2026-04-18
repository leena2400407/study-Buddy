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
const gameCell = document.getElementById('game');
const guid = document.getElementById('guid');
const ai = document.getElementById('ai');
const eduGAte = document.getElementById('btn-edugate');
const game = document.getElementById('btn-game');
const matching = document.getElementById('btn-matching');


let selectedIndex = 0;
const cellCount = 6; 
let isCylinderOpen = false;

    const bgImages = [
    '../assests/images/new-event-bg-cy.avif',     // Events (Stadium)
    '../assests/images/game-GB-CYlinder.jpg',      // Game (Gaming)
    '../assests/images/resources-bg-cyl.avif', // Resources (Library)
    '../assests/images/matching.jpg.jpeg',     // Match (Friends)
    '../assests/images/AI-GB-cy.webp',        // AI Chat (Tech)
    '../assests/images/guid.jpg.jpeg'      // Guide (Campus)
];



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
    
    document.body.style.animation = 'none';
    const activeImage = bgImages[activeIdx] || bgImages[0];
    
    // Flipped to make the center clear and the edges dark (Vignette)
    document.body.style.background = `radial-gradient(circle at center, rgba(10, 18, 34, 0) 30%, rgba(5, 10, 20, 0.95) 80%), url('${activeImage}') center/cover no-repeat`;
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

if (gameCell) {
    gameCell.addEventListener('click', () => {
        window.location.href = 'game-landing-page.html';
    });
}

if (guid) {
    guid.addEventListener('click', () => {
        window.location.href = 'FreshmanGuid.html'; 
    });
}

if (ai) {
    ai.addEventListener('click', () => {
        window.location.href = 'ai.html'; 
    });
}

if (eduGAte) {
    eduGAte.addEventListener('click', () => {
        window.location.href = 'eduGate.html'; 
    });
}

if (matching) {
    matching.addEventListener('click', () => {
        window.location.href = 'Matching.html'; 
    });
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
function toggleProfile() {
        var profileCard = document.getElementById("profileCard");
        
        // Toggle between hidden and flex (flex keeps everything centered!)
        if (profileCard.style.display === "flex") {
            profileCard.style.display = "none";
        } else {
            profileCard.style.display = "flex";
        }
    }

    // This closes the card if you click anywhere else on the page
    window.onclick = function(event) {
        if (!event.target.closest('.profile-dropdown')) {
            var profileCard = document.getElementById("profileCard");
            if (profileCard && profileCard.style.display === "flex") {
                profileCard.style.display = "none";
            }
        }
    }
