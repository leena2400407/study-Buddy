let selectedWeakSubject = "";
let selectedStrongSubject = "";
let myWeakSubjects = [];
let myStrongSubjects = [];
let currentMatches = [];

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

async function loadSubjects() {
  if (!requireLogin("Please login before using matching.")) {
    return;
  }

  try {
    const response = await fetch("/api/matching/subjects", {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not load subjects.", "error");
      return;
    }

    renderSubjectDropdowns(data.subjects || []);
  } catch (error) {
    console.error("Load subjects error:", error);
    showToast("Server error while loading subjects.", "error");
  }
}

function renderSubjectDropdowns(subjects) {
  const weakSelect = document.getElementById("weakSubjectSelect");
  const strongSelect = document.getElementById("strongSubjectSelect");

  if (!weakSelect || !strongSelect) return;

  weakSelect.innerHTML = `<option value="">Choose weak subject</option>`;
  strongSelect.innerHTML = `<option value="">Choose strong subject</option>`;

  subjects.forEach(subject => {
    weakSelect.innerHTML += `
      <option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>
    `;

    strongSelect.innerHTML += `
      <option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>
    `;
  });
}

async function loadMyProfile() {
  if (!isLoggedIn()) return;

  try {
    const response = await fetch("/api/matching/profile", {
      cache: "no-store"
    });

    const data = await response.json();

    if (data.success && data.profile) {
      myWeakSubjects = Array.isArray(data.profile.weakSubjects)
        ? data.profile.weakSubjects
        : [];

      myStrongSubjects = Array.isArray(data.profile.strongSubjects)
        ? data.profile.strongSubjects
        : [];
    }

    renderProfileList();
  } catch (error) {
    console.error("Load profile error:", error);
    renderProfileList();
  }
}

function addSelectedSubject(type) {
  if (!requireLogin("Please login first.")) return;

  const weakSelect = document.getElementById("weakSubjectSelect");
  const strongSelect = document.getElementById("strongSubjectSelect");

  if (!weakSelect || !strongSelect) return;

  const value = type === "weak"
    ? weakSelect.value.trim()
    : strongSelect.value.trim();

  if (!value) {
    showToast("Choose a subject first.", "warning");
    return;
  }

  if (type === "weak") {
    if (myStrongSubjects.includes(value)) {
      showToast("This subject is already in your strong list.", "warning");
      return;
    }

    if (!myWeakSubjects.includes(value)) {
      myWeakSubjects.push(value);
    }

    weakSelect.value = "";
  }

  if (type === "strong") {
    if (myWeakSubjects.includes(value)) {
      showToast("This subject is already in your weak list.", "warning");
      return;
    }

    if (!myStrongSubjects.includes(value)) {
      myStrongSubjects.push(value);
    }

    strongSelect.value = "";
  }

  renderProfileList();
}

function removeSubject(subject, type) {
  if (type === "weak") {
    myWeakSubjects = myWeakSubjects.filter(item => item !== subject);
  } else {
    myStrongSubjects = myStrongSubjects.filter(item => item !== subject);
  }

  renderProfileList();
}

function renderProfileList() {
  const profileWeak = document.getElementById("profileWeak");
  const profileStrong = document.getElementById("profileStrong");

  if (!profileWeak || !profileStrong) return;

  if (myWeakSubjects.length === 0) {
    profileWeak.className = "subject-list empty-list";
    profileWeak.innerHTML = "No weak subjects added yet.";
  } else {
    profileWeak.className = "subject-list";
    profileWeak.innerHTML = myWeakSubjects.map(subject => `
      <span class="subject-pill weak-pill">
        Need: ${escapeHTML(subject)}
        <button class="remove-pill" onclick="removeSubject('${escapeJS(subject)}', 'weak')">×</button>
      </span>
    `).join("");
  }

  if (myStrongSubjects.length === 0) {
    profileStrong.className = "subject-list empty-list";
    profileStrong.innerHTML = "No strong subjects added yet.";
  } else {
    profileStrong.className = "subject-list";
    profileStrong.innerHTML = myStrongSubjects.map(subject => `
      <span class="subject-pill strong-pill">
        Teach: ${escapeHTML(subject)}
        <button class="remove-pill" onclick="removeSubject('${escapeJS(subject)}', 'strong')">×</button>
      </span>
    `).join("");
  }
}

async function saveStudyList() {
  if (!requireLogin("Please login before saving your study list.")) return;

  if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
    showToast("Add at least one weak or strong subject.", "warning");
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
      showToast(data.message || "Could not save your list.", "error");
      return;
    }

    myWeakSubjects = data.profile.weakSubjects || [];
    myStrongSubjects = data.profile.strongSubjects || [];

    renderProfileList();
    showToast("Study list saved.", "success");
  } catch (error) {
    console.error("Save study list error:", error);
    showToast("Server error while saving list.", "error");
  }
}

async function clearStudyList() {
  if (!requireLogin("Please login first.")) return;

  const confirmClear = confirm("Clear your study list?");

  if (!confirmClear) return;

  try {
    const response = await fetch("/api/matching/profile/clear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not clear list.", "error");
      return;
    }

    myWeakSubjects = [];
    myStrongSubjects = [];
    currentMatches = [];
    selectedWeakSubject = "";
    selectedStrongSubject = "";

    renderProfileList();
    renderMatches();

    showToast("Study list cleared.", "success");
  } catch (error) {
    console.error("Clear study list error:", error);
    showToast("Server error while clearing list.", "error");
  }
}

async function searchMatches() {
  if (!requireLogin("Please login before searching for matches.")) {
    return;
  }

  const weakSelect = document.getElementById("weakSubjectSelect");
  const strongSelect = document.getElementById("strongSubjectSelect");

  if (!weakSelect || !strongSelect) return;

  selectedWeakSubject = weakSelect.value.trim();
  selectedStrongSubject = strongSelect.value.trim();

  if (selectedWeakSubject) {
    if (myStrongSubjects.includes(selectedWeakSubject)) {
      showToast("Weak subject cannot already be in your strong list.", "warning");
      return;
    }

    if (!myWeakSubjects.includes(selectedWeakSubject)) {
      myWeakSubjects.push(selectedWeakSubject);
    }
  }

  if (selectedStrongSubject) {
    if (myWeakSubjects.includes(selectedStrongSubject)) {
      showToast("Strong subject cannot already be in your weak list.", "warning");
      return;
    }

    if (!myStrongSubjects.includes(selectedStrongSubject)) {
      myStrongSubjects.push(selectedStrongSubject);
    }
  }

  renderProfileList();

  if (myWeakSubjects.length === 0 || myStrongSubjects.length === 0) {
    showToast("Add at least one weak subject and one strong subject.", "warning");
    return;
  }

  renderLoadingMatches();

  try {
    const response = await fetch("/api/matching/search", {
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
      currentMatches = [];
      renderMatches();
      showToast(data.message || "Could not search matches.", "error");
      return;
    }

    currentMatches = Array.isArray(data.matches) ? data.matches : [];
    renderMatches();

    if (currentMatches.length === 0) {
      showToast("No matching students found yet.", "warning");
    } else {
      showToast("Matching students loaded.", "success");
    }
  } catch (error) {
    console.error("Search matches error:", error);
    currentMatches = [];
    renderMatches();
    showToast("Server error while searching matches.", "error");
  }
}

function renderLoadingMatches() {
  const matchesGrid = document.getElementById("matchesGrid");

  if (!matchesGrid) return;

  matchesGrid.innerHTML = `
    <div class="empty-state-card">
      <div class="empty-icon">⏳</div>
      <h3>Searching...</h3>
      <p>Finding students who can help you.</p>
    </div>
  `;
}

function renderMatches() {
  const matchesGrid = document.getElementById("matchesGrid");

  if (!matchesGrid) return;

  if (!currentMatches.length) {
    matchesGrid.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">🔎</div>
        <h3>No students found</h3>
        <p>No student from your same university and major can help with your weak subjects yet.</p>
      </div>
    `;
    return;
  }

  matchesGrid.innerHTML = currentMatches.map(match => {
    const name = match.fullName || match.username || "Student";
    const firstName = name.split(" ")[0];
    const avatarLetter = name.charAt(0).toUpperCase();

    const weakSubjects = Array.isArray(match.weakSubjects)
      ? match.weakSubjects
      : [];

    const strongSubjects = Array.isArray(match.strongSubjects)
      ? match.strongSubjects
      : [];

    const canHelpMe = Array.isArray(match.canHelpMe)
      ? match.canHelpMe
      : [];

    const iCanHelpThem = Array.isArray(match.iCanHelpThem)
      ? match.iCanHelpThem
      : [];

    const requestWeakSubject = canHelpMe[0] || myWeakSubjects[0] || "";
    const requestStrongSubject = iCanHelpThem[0] || myStrongSubjects[0] || "";

    return `
      <div class="buddy-card">
        <div class="buddy-top">
          <div class="buddy-avatar">${escapeHTML(avatarLetter)}</div>

          <div class="buddy-name">
            <h3>${escapeHTML(name)}</h3>
            <p>
              ${escapeHTML(match.university || "Unknown University")}
              -
              ${escapeHTML(match.major || "Unknown Major")}
            </p>
          </div>

          <span class="match-score">${escapeHTML(match.matchType || "Helper Match")}</span>
        </div>

        <div class="buddy-subjects">
          <div class="subject-row">
            <h5>Can help you with</h5>
            <div class="small-tags">
              ${
                canHelpMe.length
                  ? canHelpMe.map(subject => `
                      <span class="small-tag">${escapeHTML(subject)}</span>
                    `).join("")
                  : `<span class="small-tag empty-tag">No exact subject</span>`
              }
            </div>
          </div>

          <div class="subject-row">
            <h5>You can help them with</h5>
            <div class="small-tags">
              ${
                iCanHelpThem.length
                  ? iCanHelpThem.map(subject => `
                      <span class="small-tag">${escapeHTML(subject)}</span>
                    `).join("")
                  : `<span class="small-tag empty-tag">Not a swap match</span>`
              }
            </div>
          </div>

          <div class="subject-row">
            <h5>Their strong subjects</h5>
            <div class="small-tags">
              ${
                strongSubjects.length
                  ? strongSubjects.map(subject => `
                      <span class="small-tag">${escapeHTML(subject)}</span>
                    `).join("")
                  : `<span class="small-tag empty-tag">No strong subjects</span>`
              }
            </div>
          </div>

          <div class="subject-row">
            <h5>They need help with</h5>
            <div class="small-tags">
              ${
                weakSubjects.length
                  ? weakSubjects.map(subject => `
                      <span class="small-tag">${escapeHTML(subject)}</span>
                    `).join("")
                  : `<span class="small-tag empty-tag">No weak subjects</span>`
              }
            </div>
          </div>
        </div>

        <button
          class="btn-match"
          onclick="sendMatchRequest('${escapeJS(match.profileId)}', '${escapeJS(name)}', '${escapeJS(requestWeakSubject)}', '${escapeJS(requestStrongSubject)}')"
        >
          Send Request to ${escapeHTML(firstName)}
        </button>
      </div>
    `;
  }).join("");
}

async function sendMatchRequest(receiverProfileId, name, weakSubject, strongSubject) {
  if (!requireLogin("Please login before sending a match request.")) {
    return;
  }

  if (!receiverProfileId) {
    showToast("Matched student was not selected.", "error");
    return;
  }

  const senderWeakSubject = String(weakSubject || "").trim();
  const senderStrongSubject = String(strongSubject || "").trim();

  if (!senderWeakSubject || !senderStrongSubject) {
    showToast("This match is missing a weak or strong subject.", "warning");
    return;
  }

  const confirmSend = confirm(`Send a match request to ${name}?`);

  if (!confirmSend) return;

  try {
    showToast(`Sending request to ${name}...`, "info");

    const response = await fetch("/api/matching/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        receiverProfileId,
        weakSubject: senderWeakSubject,
        strongSubject: senderStrongSubject
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not send match request.", "error");
      return;
    }

    showToast(data.message || `Match request sent to ${name}.`, "success");
    await loadMyRequests();
  } catch (error) {
    console.error("Send match request error:", error);
    showToast("Server error while sending match request.", "error");
  }
}

async function loadMyRequests() {
  const requestsGrid = document.getElementById("requestsGrid");

  if (!requestsGrid) return;

  try {
    const response = await fetch("/api/matching/requests", {
      cache: "no-store"
    });

    if (response.status === 404) {
      renderEmptyRequests();
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      renderEmptyRequests();
      return;
    }

    renderRequests(data.requests || []);
  } catch (error) {
    console.error("Load requests error:", error);
    renderEmptyRequests();
  }
}

function renderRequests(requests) {
  const requestsGrid = document.getElementById("requestsGrid");

  if (!requestsGrid) return;

  if (!Array.isArray(requests) || requests.length === 0) {
    renderEmptyRequests();
    return;
  }

  requestsGrid.innerHTML = requests.map(request => {
    const otherName =
      request.otherName ||
      request.receiverName ||
      request.senderName ||
      "Student";

    const status = request.status || "pending";

    return `
      <div class="buddy-card request-card">
        <div class="buddy-top">
          <div class="buddy-avatar">${escapeHTML(otherName.charAt(0).toUpperCase())}</div>

          <div class="buddy-name">
            <h3>${escapeHTML(otherName)}</h3>
            <p>${escapeHTML(request.direction || "request")} request</p>
          </div>

          <span class="match-score">${escapeHTML(status)}</span>
        </div>

        <div class="buddy-subjects">
          <div class="subject-row">
            <h5>Subject needed</h5>
            <div class="small-tags">
              <span class="small-tag">${escapeHTML(request.senderWeakSubject || "-")}</span>
            </div>
          </div>

          <div class="subject-row">
            <h5>Can help with</h5>
            <div class="small-tags">
              <span class="small-tag">${escapeHTML(request.senderStrongSubject || "-")}</span>
            </div>
          </div>
        </div>

        ${
          status === "accepted" && request.chat
            ? `<button class="btn-match" onclick="window.location.href='/matching/chat/${escapeJS(request.chat)}'">
                Open Chat
              </button>`
            : status === "pending" && request.direction === "sent"
              ? `<button class="btn-match cancel-request-btn" onclick="cancelMatchRequest('${escapeJS(request._id)}')">
                  Cancel Request
                </button>`
              : status === "pending" && request.direction === "received"
                ? `<div class="request-actions">
                    <button class="btn-match accept-request-btn" onclick="acceptMatchRequest('${escapeJS(request._id)}')">
                      Accept
                    </button>

                    <button class="btn-match reject-request-btn" onclick="rejectMatchRequest('${escapeJS(request._id)}')">
                      Reject
                    </button>
                  </div>`
                : `<button class="btn-match" disabled>
                    ${escapeHTML(status)}
                  </button>`
        }
      </div>
    `;
  }).join("");
}

function renderEmptyRequests() {
  const requestsGrid = document.getElementById("requestsGrid");

  if (!requestsGrid) return;

  requestsGrid.innerHTML = `
    <div class="empty-state-card small-empty">
      <div class="empty-icon">📩</div>
      <h3>No requests yet</h3>
      <p>Your sent, received, accepted, and rejected match requests will appear here.</p>
    </div>
  `;
}

async function cancelMatchRequest(requestId) {
  if (!requireLogin("Please login first.")) {
    return;
  }

  const confirmCancel = confirm("Cancel this match request?");

  if (!confirmCancel) return;

  try {
    const response = await fetch(`/api/matching/request/${requestId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not cancel request.", "error");
      return;
    }

    showToast(data.message || "Request cancelled.", "success");
    await loadMyRequests();
  } catch (error) {
    console.error("Cancel match request error:", error);
    showToast("Server error while cancelling request.", "error");
  }
}

async function acceptMatchRequest(requestId) {
  if (!requireLogin("Please login first.")) {
    return;
  }

  const confirmAccept = confirm("Accept this match request and open a chat?");

  if (!confirmAccept) return;

  try {
    const response = await fetch(`/api/matching/request/${requestId}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not accept request.", "error");
      return;
    }

    showToast(data.message || "Request accepted.", "success");

    if (data.chatId) {
      setTimeout(() => {
        window.location.href = `/matching/chat/${data.chatId}`;
      }, 700);
      return;
    }

    await loadMyRequests();
  } catch (error) {
    console.error("Accept match request error:", error);
    showToast("Server error while accepting request.", "error");
  }
}

async function rejectMatchRequest(requestId) {
  if (!requireLogin("Please login first.")) {
    return;
  }

  const confirmReject = confirm("Reject this match request?");

  if (!confirmReject) return;

  try {
    const response = await fetch(`/api/matching/request/${requestId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not reject request.", "error");
      return;
    }

    showToast(data.message || "Request rejected.", "success");
    await loadMyRequests();
  } catch (error) {
    console.error("Reject match request error:", error);
    showToast("Server error while rejecting request.", "error");
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

document.addEventListener("DOMContentLoaded", () => {
  loadSubjects();
  loadMyProfile();
  loadMyRequests();
});

window.addEventListener("pageshow", () => {
  loadMyProfile();
  loadMyRequests();
});

setInterval(() => {
  if (isLoggedIn()) {
    loadMyRequests();
  }
}, 5000);