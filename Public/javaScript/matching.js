let myWeakSubjects = [];
let myStrongSubjects = [];
let students = [];
let requestPublished = false;

const REQUEST_STORAGE_KEY = "studyBuddyRequestPublished";

function isLoggedIn() {
    return Boolean(
        window.MATCHING_PAGE_DATA && window.MATCHING_PAGE_DATA.isLoggedIn
    );
}

function requireLogin(message = "Please login first.") {
    if (isLoggedIn()) {
        return true;
    }

    showToast(message, "error");

    setTimeout(() => {
        window.location.href = "/login?returnTo=/matching";
    }, 1200);

    return false;
}

async function fetchMyProfile() {
    try {
      const response = await fetch("/api/matching/profile", {
        cache: "no-store"
        }); 

        if (response.status === 401) {
            renderAll();
            return;
        }

        const data = await response.json();

        if (data.success && data.profile) {
            myWeakSubjects = data.profile.weakSubjects || [];
            myStrongSubjects = data.profile.strongSubjects || [];
        }

        renderAll();
    } catch (error) {
        console.error("Fetch profile error:", error);
        renderAll();
    }
}

function openModal() {
    if (!requireLogin("Please login before building your study list.")) {
        return;
    }

    const overlay = document.getElementById("overlay");
    if (!overlay) return;

    overlay.classList.add("active");
    renderTags();
}

function closeModal() {
    const overlay = document.getElementById("overlay");
    if (!overlay) return;

    overlay.classList.remove("active");
}

function handleTag(event, type) {
    if (event.key === "Enter") {
        event.preventDefault();
        addSubject(type);
    }
}

function normalizeSubject(value) {
    return value
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function addSubject(type) {
    const input = type === "weak"
        ? document.getElementById("weakInput")
        : document.getElementById("strongInput");

    if (!input) return;

    const value = normalizeSubject(input.value);

    if (!value) return;

    if (type === "weak") {
        if (!myWeakSubjects.includes(value)) {
            myWeakSubjects.push(value);
        }
    } else {
        if (!myStrongSubjects.includes(value)) {
            myStrongSubjects.push(value);
        }
    }

    input.value = "";
    renderAll();
}

function removeSubject(subject, type) {
    if (type === "weak") {
        myWeakSubjects = myWeakSubjects.filter(item => item !== subject);
    } else {
        myStrongSubjects = myStrongSubjects.filter(item => item !== subject);
    }

    renderAll();
}

async function saveList() {
    if (!requireLogin("Please login before saving your study list.")) {
        return;
    }

    if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
        showToast("Add at least one weak subject or one strong subject.", "warning");
        return;
    }

    try {
        const response = await fetch("/api/matching/profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                weakSubjects: myWeakSubjects,
                strongSubjects: myStrongSubjects
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "Could not save your study list.", "error");
            return;
        }

        myWeakSubjects = data.profile.weakSubjects || [];
        myStrongSubjects = data.profile.strongSubjects || [];

        closeModal();
        showToast("Your study list has been saved.", "success");
        renderAll();
    } catch (error) {
        console.error("Save list error:", error);
        showToast("Server error while saving your list.", "error");
    }
}


async function clearStudyList() {
    if (!requireLogin("Please login first.")) {
        return;
    }

    const confirmClear = confirm("Are you sure you want to clear your study list?");

    if (!confirmClear) {
        return;
    }

    try {
        const response = await fetch("/api/matching/profile/clear", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "Could not clear your study list.", "error");
            return;
        }

        myWeakSubjects = [];
        myStrongSubjects = [];
        students = [];
        requestPublished = false;
        localStorage.removeItem(REQUEST_STORAGE_KEY);

        renderAll();

        showToast("Your study list has been cleared.", "success");

    } catch (error) {
        console.error("Clear study list error:", error);
        showToast("Server error while clearing your study list.", "error");
    }
}

async function startSearchFlow() {
    if (!requireLogin("Please login before adding a match request.")) {
        return;
    }

    if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
        showToast("Build and save your list first.", "warning");
        openModal();
        return;
    }

    requestPublished = true;
    localStorage.setItem(REQUEST_STORAGE_KEY, "true");

    const matchesSection = document.getElementById("matches-section");

    if (matchesSection) {
        matchesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    await loadMatches();

    if (students.length === 0) {
        showToast("No matching students found yet.", "warning");
    } else {
        showToast("Available students loaded.", "success");
    }
}

async function loadMatches() {
    try {
       const response = await fetch("/api/matching/matches", {
            cache: "no-store"
            });
        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "Could not load matches.", "error");
            students = [];
            renderMatches();
            return;
        }

        students = data.matches || [];
        renderMatches();
    } catch (error) {
        console.error("Load matches error:", error);
        showToast("Server error while loading matches.", "error");
        students = [];
        renderMatches();
    }
}

function renderTags() {
    const weakContainer = document.getElementById("weakContainer");
    const strongContainer = document.getElementById("strongContainer");

    if (!weakContainer || !strongContainer) return;

    weakContainer.innerHTML = "";

    myWeakSubjects.forEach(subject => {
        weakContainer.innerHTML += `
            <div class="tag">
                ${escapeHTML(subject)}
                <span onclick="removeSubject('${escapeJS(subject)}', 'weak')">&times;</span>
            </div>
        `;
    });

    weakContainer.innerHTML += `
        <input
            type="text"
            class="tag-input"
            id="weakInput"
            placeholder="Example: Math"
            onkeydown="handleTag(event, 'weak')"
        />
        <button class="add-tag-btn" type="button" onclick="addSubject('weak')">Add</button>
    `;

    strongContainer.innerHTML = "";

    myStrongSubjects.forEach(subject => {
        strongContainer.innerHTML += `
            <div class="tag">
                ${escapeHTML(subject)}
                <span onclick="removeSubject('${escapeJS(subject)}', 'strong')">&times;</span>
            </div>
        `;
    });

    strongContainer.innerHTML += `
        <input
            type="text"
            class="tag-input"
            id="strongInput"
            placeholder="Example: Data Structure"
            onkeydown="handleTag(event, 'strong')"
        />
        <button class="add-tag-btn" type="button" onclick="addSubject('strong')">Add</button>
    `;
}

function renderProfile() {
    const profileWeak = document.getElementById("profileWeak");
    const profileStrong = document.getElementById("profileStrong");

    if (!profileWeak || !profileStrong) return;

    if (myWeakSubjects.length === 0) {
        profileWeak.className = "subject-list empty-list";
        profileWeak.innerHTML = "No weak subjects added yet.";
    } else {
        profileWeak.className = "subject-list";
        profileWeak.innerHTML = myWeakSubjects.map(subject => `
            <span class="subject-pill weak-pill">Need: ${escapeHTML(subject)}</span>
        `).join("");
    }

    if (myStrongSubjects.length === 0) {
        profileStrong.className = "subject-list empty-list";
        profileStrong.innerHTML = "No strong subjects added yet.";
    } else {
        profileStrong.className = "subject-list";
        profileStrong.innerHTML = myStrongSubjects.map(subject => `
            <span class="subject-pill strong-pill">Teach: ${escapeHTML(subject)}</span>
        `).join("");
    }
}

function renderMatches() {
    const matchesGrid = document.getElementById("matchesGrid");
    const searchInput = document.getElementById("searchInput");

    if (!matchesGrid) return;

    if (!requestPublished) {
        matchesGrid.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon">🔎</div>
                <h3>No request yet</h3>
                <p>Click Add Request after saving your list to find available students.</p>
            </div>
        `;
        return;
    }

    const searchValue = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    let filteredStudents = students.filter(student => {
        const allText = [
            student.fullName || "",
            student.username || "",
            student.email || "",
            student.university || "",
            student.major || "",
            ...(student.weakSubjects || []),
            ...(student.strongSubjects || [])
        ].join(" ").toLowerCase();

        return allText.includes(searchValue);
    });

    if (filteredStudents.length === 0) {
        matchesGrid.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon">🔎</div>
                <h3>No students found</h3>
                <p>No available students match your saved list right now.</p>
            </div>
        `;
        return;
    }

    matchesGrid.innerHTML = filteredStudents.map(student => {
        const name = student.fullName || student.username || "Student";
        const firstName = name.split(" ")[0];
        const avatarLetter = name.charAt(0).toUpperCase();

        return `
            <div class="buddy-card">
                <div class="buddy-top">
                    <div class="buddy-avatar">${escapeHTML(avatarLetter)}</div>

                    <div class="buddy-name">
                    <h3>${escapeHTML(name)}</h3>
                    <p>${escapeHTML(student.university || "Unknown University")} - ${escapeHTML(student.major || "Study Buddy Student")}</p>
                    </div>
                    
                </div>

                
                <div class="buddy-subjects">
                    <div class="subject-row">
                        <h5>Strong Subjects</h5>
                        <div class="small-tags">
                            ${
                                student.strongSubjects && student.strongSubjects.length
                                    ? student.strongSubjects.map(subject => `
                                        <span class="small-tag">${escapeHTML(subject)}</span>
                                    `).join("")
                                    : `<span class="small-tag empty-tag">No strong subjects</span>`
                            }
                        </div>
                    </div>

                    <div class="subject-row">
                        <h5>Needs Help With</h5>
                        <div class="small-tags">
                            ${
                                student.weakSubjects && student.weakSubjects.length
                                    ? student.weakSubjects.map(subject => `
                                        <span class="small-tag">${escapeHTML(subject)}</span>
                                    `).join("")
                                    : `<span class="small-tag empty-tag">No weak subjects</span>`
                            }
                        </div>
                    </div>
                </div>

                <button class="btn-match" onclick="sendMatch('${escapeJS(student._id)}', '${escapeJS(name)}')">
                    Match With ${escapeHTML(firstName)}
                </button>
            </div>
        `;
    }).join("");
}

async function sendMatch(matchedProfileId, name) {
    if (!requireLogin("Please login before sending a match request.")) {
        return;
    }

    if (!requestPublished) {
        showToast("Click Add Request before matching.", "warning");
        return;
    }

    try {
        showToast(`Creating video room with ${name}...`, "info");

        const response = await fetch("/api/matching/send-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                matchedProfileId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showToast(data.message || "Could not send video room.", "error");
            return;
        }

        showToast(data.message || `Video room sent to you and ${name}.`, "success");
    } catch (error) {
        console.error("Send match room error:", error);
        showToast("Server error while creating the video room.", "error");
    }
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.className = "toast show";

    if (type) {
        toast.classList.add(type);
    }

    clearTimeout(window.studyBuddyToastTimer);

    window.studyBuddyToastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJS(value) {
    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"');
}

function renderAll() {
    renderTags();
    renderProfile();
    renderMatches();
}

async function restoreRequestWhenBack() {
    await fetchMyProfile();

    const savedRequest = localStorage.getItem(REQUEST_STORAGE_KEY) === "true";

    if (savedRequest && (myWeakSubjects.length > 0 || myStrongSubjects.length > 0)) {
        requestPublished = true;
        renderMatches();
        await loadMatches();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    restoreRequestWhenBack();
});

window.addEventListener("pageshow", () => {
    restoreRequestWhenBack();
});