/* ============================================================
   STUDY BUDDY — home.js
   Shared by index.ejs and cylinder.ejs.
   ============================================================ */

const btnFeatures       = document.getElementById('btn-features');
const homePage          = document.getElementById('home-page');
const featuresPage      = document.getElementById('features-page');
const cylinderScene     = document.getElementById('cylinder-scene');
const controls          = document.getElementById('controls');
const CylinderElem      = document.getElementById('Cylinder');
const bgEffects         = document.getElementById('bg-effects');
const introLogo         = document.getElementById('intro-logo');
const navCylinderToggle = document.getElementById('navCylinderToggle');
const cylinderScrollNav = document.getElementById('cylinderScrollNav');
const themeToggle       = document.getElementById('themeToggle');

let selectedIndex  = 0;
const cellCount    = 6;
let isCylinderOpen = false;
let cylinderPageInitialized = false;

const CYLINDER_INTRO_FLAG = 'studyBuddyPlayCylinderIntro';
const CYLINDER_THEME_KEY  = 'studyBuddyCylinderTheme';

/* ------------------------------------------------------------
   THEME TOGGLE
   This is the only new part.
   It does not change cylinder movement, pop animation, or nav logic.
   ------------------------------------------------------------ */
function getSavedCylinderTheme() {
    try {
        return localStorage.getItem(CYLINDER_THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
        return 'light';
    }
}

function saveCylinderTheme(theme) {
    try {
        localStorage.setItem(CYLINDER_THEME_KEY, theme === 'dark' ? 'dark' : 'light');
    } catch (error) {
        // Ignore localStorage errors
    }
}

function applyCylinderTheme(theme) {
    if (!document.body.classList.contains('cylinder-body')) return;

    const isDark = theme === 'dark';

    document.documentElement.classList.toggle('cylinder-dark-theme-root', isDark);
    document.body.classList.toggle('cylinder-dark-theme', isDark);
    document.body.setAttribute('data-cylinder-theme', isDark ? 'dark' : 'light');

    const currentThemeToggle = document.getElementById('themeToggle');

    if (currentThemeToggle) {
        currentThemeToggle.classList.toggle('is-dark', isDark);
        currentThemeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        currentThemeToggle.setAttribute(
            'aria-label',
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
        );
    }
}

function toggleCylinderTheme(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const nextTheme = document.body.classList.contains('cylinder-dark-theme')
        ? 'light'
        : 'dark';

    applyCylinderTheme(nextTheme);
    saveCylinderTheme(nextTheme);
}

function initCylinderTheme() {
    if (!document.body.classList.contains('cylinder-body')) return;

    applyCylinderTheme(getSavedCylinderTheme());

    const currentThemeToggle = document.getElementById('themeToggle');

    if (currentThemeToggle) {
        currentThemeToggle.removeEventListener('click', toggleCylinderTheme);
        currentThemeToggle.addEventListener('click', toggleCylinderTheme);
    }
}

initCylinderTheme();

/* ------------------------------------------------------------
   SESSION FLAG HELPERS
   Intro plays ONLY when this flag is set by the index button.
   ------------------------------------------------------------ */
function setCylinderIntroFlag() {
    try {
        sessionStorage.setItem(CYLINDER_INTRO_FLAG, 'yes');
    } catch (error) {
        // Ignore storage errors
    }
}

function consumeCylinderIntroFlag() {
    try {
        const shouldPlay = sessionStorage.getItem(CYLINDER_INTRO_FLAG) === 'yes';
        sessionStorage.removeItem(CYLINDER_INTRO_FLAG);
        return shouldPlay;
    } catch (error) {
        return false;
    }
}

/* ------------------------------------------------------------
   ENTER CYLINDER FROM INDEX BUTTON ONLY
   ------------------------------------------------------------ */
function enterCylinderFromHome(event) {
    if (event) event.preventDefault();

    setCylinderIntroFlag();
    window.location.href = '/cylinder';
}

if (btnFeatures) {
    btnFeatures.onclick = null;
    btnFeatures.addEventListener('click', enterCylinderFromHome);
}

/* ------------------------------------------------------------
   EDUGATE BUTTON REDIRECT
   Safe: does nothing if btn-edugate is not on this page.
   ------------------------------------------------------------ */
const btnEdugate = document.getElementById('btn-edugate');

if (btnEdugate) {
    btnEdugate.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = '/edugate';
    });
}

/* ------------------------------------------------------------
   OPEN THE CYLINDER
   ------------------------------------------------------------ */
function openCylinder() {
    if (isCylinderOpen) return;

    isCylinderOpen = true;

    if (controls) {
        controls.style.display = 'flex';
        controls.style.opacity = '';
        controls.style.pointerEvents = '';
    }

    if (cylinderScene) cylinderScene.classList.add('is-open');

    updateCylinder();
    startEffects();
}

/* ------------------------------------------------------------
   ROTATE + HIGHLIGHT THE FRONT CARD
   ------------------------------------------------------------ */
function updateCylinder() {
    if (!isCylinderOpen || !CylinderElem) return;

    const angle = (selectedIndex / cellCount) * -360;
    CylinderElem.style.transform = `translateZ(-560px) rotateY(${angle}deg)`;

    const activeIdx = ((selectedIndex % cellCount) + cellCount) % cellCount;

    document.querySelectorAll('.Cylinder__cell').forEach((cell, idx) => {
        cell.classList.toggle('is-active', idx === activeIdx);
    });
}

/* ------------------------------------------------------------
   SPIN LEFT / RIGHT
   ------------------------------------------------------------ */
function spin(direction) {
    selectedIndex += direction;
    updateCylinder();
}

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

if (prevBtn) prevBtn.addEventListener('click', () => spin(-1));
if (nextBtn) nextBtn.addEventListener('click', () => spin(1));

document.addEventListener('keydown', (event) => {
    if (!cylinderScene) return;

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        spin(-1);
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        spin(1);
    }
});

/* ------------------------------------------------------------
   CLEAR BROKEN BACK-BUTTON STATE
   This fixes browser back button after a card launch.
   ------------------------------------------------------------ */
function clearCardLaunchState() {
    document.body.classList.remove('card-launched');

    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;

    document.querySelectorAll('.Cylinder__cell').forEach((cell) => {
        if (typeof cell.getAnimations === 'function') {
            cell.getAnimations().forEach((animation) => animation.cancel());
        }

        cell.classList.remove('is-poping');

        cell.style.animation = '';
        cell.style.willChange = '';
        cell.style.opacity = '';
        cell.style.filter = '';
        cell.style.transform = '';
    });
}

function showCylinderInstantly() {
    if (!cylinderScene || !CylinderElem) return;

    clearCardLaunchState();

    isCylinderOpen = true;

    if (featuresPage) featuresPage.style.display = 'flex';

    if (controls) {
        controls.style.display = 'flex';
        controls.style.opacity = '';
        controls.style.pointerEvents = '';
    }

    if (introLogo) {
        introLogo.classList.add('hide');
        introLogo.style.display = 'none';
    }

    if (typeof CylinderElem.getAnimations === 'function') {
        CylinderElem.getAnimations().forEach((animation) => animation.cancel());
    }

    cylinderScene.classList.remove('intro');
    cylinderScene.classList.add('is-open');

    CylinderElem.classList.remove('intro-reveal');

    const oldTransition = CylinderElem.style.transition;

    CylinderElem.style.transition = 'none';
    CylinderElem.style.transform = `translateZ(-560px) rotateY(${(selectedIndex / cellCount) * -360}deg)`;

    CylinderElem.offsetHeight;

    CylinderElem.style.transition = oldTransition;

    updateCylinder();
    startEffects();

    document.body.style.opacity = '0';

    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.22s ease';
        document.body.style.opacity = '1';
    });

    setTimeout(() => {
        document.body.style.transition = '';
        document.body.style.opacity = '';
    }, 260);
}

/* ------------------------------------------------------------
   CARD CLICK HANDLER
   No unwanted small spin.
   ------------------------------------------------------------ */
function openCard(cell) {
    if (!cell || !cell.classList.contains('is-active')) return;

    const href = cell.getAttribute('data-href');
    if (!href) return;

    if (cell.classList.contains('is-poping')) return;

    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    document.body.classList.add('card-launched');

    const cells = Array.from(document.querySelectorAll('.Cylinder__cell'));
    const cardIndex = cells.indexOf(cell);

    const cardAngle = cardIndex * (360 / cellCount);
    const baseTransform = `rotateY(${cardAngle}deg) translateZ(560px)`;

    cell.classList.add('is-poping');

    cell.style.animation = 'none';
    cell.style.willChange = 'transform, opacity, filter';

    const popFrames = [
        {
            transform: `${baseTransform} scale(1)`,
            opacity: 1,
            filter: 'brightness(1)'
        },
        {
            transform: `${baseTransform} scale(1.08)`,
            opacity: 1,
            filter: 'brightness(1.4)',
            offset: 0.15
        },
        {
            transform: `${baseTransform} scale(0.02)`,
            opacity: 0,
            filter: 'brightness(3)'
        }
    ];

    const popTiming = {
        duration: 1100,
        easing: 'cubic-bezier(0.6, 0, 0.2, 1)',
        fill: 'forwards'
    };

    if (typeof cell.animate === 'function') {
        cell.animate(popFrames, popTiming);
    } else {
        cell.style.transform = `${baseTransform} scale(0.02)`;
        cell.style.opacity = '0';
        cell.style.filter = 'brightness(3)';
    }

    setTimeout(() => {
        window.location.href = href;
    }, 1100);
}

document.querySelectorAll('.Cylinder__cell').forEach((cell) => {
    cell.addEventListener('click', () => openCard(cell));
});

/* ------------------------------------------------------------
   FLOATING PARTICLES
   ------------------------------------------------------------ */
let effectsStarted = false;

function startEffects() {
    if (effectsStarted || !bgEffects) return;

    effectsStarted = true;

    const count = 16;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = 3 + Math.random() * 6;
        const duration = 14 + Math.random() * 16;

        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = 0.3 + Math.random() * 0.5;
        particle.style.animation = `floatUp ${duration}s linear infinite`;
        particle.style.animationDelay = `-${Math.random() * duration}s`;

        bgEffects.appendChild(particle);
    }
}

/* ------------------------------------------------------------
   INTRO
   Plays only if user came from index Enter Cylinder button.
   ------------------------------------------------------------ */
function playCylinderIntro() {
    if (!cylinderScene || !CylinderElem) return;

    if (featuresPage) featuresPage.style.display = 'flex';

    isCylinderOpen = false;

    cylinderScene.classList.add('intro');
    cylinderScene.classList.remove('is-open');

    CylinderElem.classList.add('intro-reveal');

    if (introLogo) {
        introLogo.style.display = 'flex';
        introLogo.classList.remove('hide');
    }

    const introMs = 2100;

    setTimeout(() => {
        if (introLogo) introLogo.classList.add('hide');
    }, 1300);

    setTimeout(() => {
        if (CylinderElem) {
            if (typeof CylinderElem.getAnimations === 'function') {
                CylinderElem.getAnimations().forEach((animation) => animation.cancel());
            }

            CylinderElem.style.transform = 'translateZ(-560px) rotateY(0deg)';
            CylinderElem.classList.remove('intro-reveal');
        }

        if (cylinderScene) cylinderScene.classList.remove('intro');

        openCylinder();

        if (introLogo) introLogo.style.display = 'none';
    }, introMs);
}

function initCylinderPage() {
    if (!cylinderScene || cylinderPageInitialized) return;

    cylinderPageInitialized = true;

    const shouldPlayIntro = consumeCylinderIntroFlag();

    if (shouldPlayIntro) {
        playCylinderIntro();
    } else {
        showCylinderInstantly();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCylinderPage);
} else {
    initCylinderPage();
}

/* ------------------------------------------------------------
   FIX BROWSER BACK BUTTON / BFCache
   Rebinds theme button after coming back from Events/Game/etc.
   ------------------------------------------------------------ */
window.addEventListener('pageshow', (event) => {
    initCylinderTheme();

    if (!cylinderScene) return;

    if (event.persisted || document.body.classList.contains('card-launched')) {
        showCylinderInstantly();
    }
});

/* ============================================================
   NEW HORIZONTAL CYLINDER SCROLL NAV
   ============================================================ */

function animateNavIcon(isOpen) {
    if (!navCylinderToggle) return;

    clearTimeout(navCylinderToggle._morphTimer);

    navCylinderToggle.classList.remove('is-open');
    navCylinderToggle.classList.add('is-morphing');

    navCylinderToggle._morphTimer = setTimeout(() => {
        navCylinderToggle.classList.remove('is-morphing');
        navCylinderToggle.classList.toggle('is-open', isOpen);
        navCylinderToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navCylinderToggle.setAttribute(
            'aria-label',
            isOpen ? 'Close navigation' : 'Open navigation'
        );
    }, 230);
}

function setScrollNavState(isOpen, animateIcon = true) {
    if (!cylinderScrollNav) return;

    cylinderScrollNav.classList.toggle('is-open', isOpen);

    const dropdown = document.getElementById('myDropdown');
    const profileCard = document.getElementById('profileCard');

    if (!isOpen) {
        if (dropdown) dropdown.classList.remove('show');
        if (profileCard) profileCard.classList.remove('show');
    }

    if (animateIcon) {
        animateNavIcon(isOpen);
    } else if (navCylinderToggle) {
        clearTimeout(navCylinderToggle._morphTimer);
        navCylinderToggle.classList.remove('is-morphing');
        navCylinderToggle.classList.toggle('is-open', isOpen);
        navCylinderToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navCylinderToggle.setAttribute(
            'aria-label',
            isOpen ? 'Close navigation' : 'Open navigation'
        );
    }
}

function openScrollNav() {
    setScrollNavState(true);
}

function closeScrollNav() {
    setScrollNavState(false);
}

function toggleScrollNav(event) {
    if (event) event.stopPropagation();
    if (!cylinderScrollNav) return;

    const willOpen = !cylinderScrollNav.classList.contains('is-open');
    setScrollNavState(willOpen);
}

if (navCylinderToggle) {
    navCylinderToggle.addEventListener('click', toggleScrollNav);

    const startsOpen = cylinderScrollNav && cylinderScrollNav.classList.contains('is-open');
    setScrollNavState(Boolean(startsOpen), false);
}

/* ============================================================
   NAV / UI HELPERS
   ============================================================ */

function goHome() {
    if (featuresPage) featuresPage.style.display = 'none';
    if (homePage) homePage.style.display = 'block';

    window.location.hash = 'home-page';
}

function toggleDropdown() {
    const dropdown = document.getElementById('myDropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');
}

function toggleProfile() {
    const profileCard = document.getElementById('profileCard');
    if (!profileCard) return;

    profileCard.classList.toggle('show');
}

window.addEventListener('click', (event) => {
    if (!event.target.closest('.cylinder-scroll-nav')) {
        closeScrollNav();
        return;
    }

    if (!event.target.closest('.dropdown')) {
        const dropdown = document.getElementById('myDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }

    if (!event.target.closest('.profile-dropdown')) {
        const profileCard = document.getElementById('profileCard');
        if (profileCard) profileCard.classList.remove('show');
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeScrollNav();
    }
});