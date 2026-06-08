let selectedWeakSubject = "";
let selectedStrongSubject = "";
let myWeakSubjects = [];
let myStrongSubjects = [];
let currentMatches = [];
let matchingSearchHasRun = false;

const MATCHING_LAST_SEARCH_KEY = "studyBuddyLastMatchingSearch";
let lastMatchesJSON = "";
let matchingLiveRefreshTimer = null;
let studyListIsSaved = false;
let studyListHasLocalChanges = false;
const LOGIN_REDIRECT_DELAY = 2200;

function normalizeDropdownSubject(value) {
  const subject = String(value || "").trim();

  if (subject.toLowerCase() === "none") {
    return "";
  }

  return subject;
}

function cleanSubjectList(subjects) {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return [...new Set(
    subjects
      .map(subject => normalizeDropdownSubject(subject))
      .filter(Boolean)
  )];
}

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

  clearTimeout(window.studyBuddyLoginRedirectTimer);

  window.studyBuddyLoginRedirectTimer = setTimeout(() => {
    window.location.href = "/login?returnTo=/matching";
  }, LOGIN_REDIRECT_DELAY);

  return false;
}

async function loadSubjects() {
  try {
    const response = await fetch("/api/matching/subjects", {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      renderSubjectDropdowns([]);
      return;
    }

    renderSubjectDropdowns(data.subjects || []);
  } catch (error) {
    console.error("Load subjects error:", error);
    renderSubjectDropdowns([]);
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

async function loadMyProfile(options = {}) {
  const force = Boolean(options.force);

  if (!isLoggedIn()) {
    resetMatchingPageAfterLogout();
    return false;
  }

  if (studyListHasLocalChanges && !force) {
    return true;
  }

  try {
    const response = await fetch("/api/matching/profile", {
      cache: "no-store"
    });

    const data = await readJSONOrLogout(response);

    if (!data || !response.ok) {
      resetMatchingPageAfterLogout();
      return false;
    }

    if (data.success && data.profile) {
     myWeakSubjects = cleanSubjectList(data.profile.weakSubjects);
    myStrongSubjects = cleanSubjectList(data.profile.strongSubjects);

      studyListIsSaved = myWeakSubjects.length > 0 || myStrongSubjects.length > 0;
    } else {
      myWeakSubjects = [];
      myStrongSubjects = [];
      studyListIsSaved = false;
    }

    studyListHasLocalChanges = false;
    renderProfileList();
    return true;
  } catch (error) {
    console.error("Load profile error:", error);
    resetMatchingPageAfterLogout();
    return false;
  }
}

function addSelectedSubject(type) {
  const weakSelect = document.getElementById("weakSubjectSelect");
  const strongSelect = document.getElementById("strongSubjectSelect");

  if (!weakSelect || !strongSelect) return;

  const rawValue = type === "weak"
    ? String(weakSelect.value || "").trim()
    : String(strongSelect.value || "").trim();

  const isNone = rawValue.toLowerCase() === "none";
  const value = normalizeDropdownSubject(rawValue);

  if (!rawValue) {
    showToast("Choose a subject first.", "warning");
    return;
  }

  if (type === "weak") {
    if (isNone) {
      myWeakSubjects = [];
      weakSelect.value = "";
      studyListIsSaved = false;
      studyListHasLocalChanges = true;

      stopSavedMatchRefresh();
      renderProfileList();
      renderNoSearchState();

      showToast("Weak list set to none. You can still search if you have strong subjects.", "info");
      return;
    }

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
    if (isNone) {
      myStrongSubjects = [];
      strongSelect.value = "";
      studyListIsSaved = false;
      studyListHasLocalChanges = true;

      stopSavedMatchRefresh();
      renderProfileList();
      renderNoSearchState();

      showToast("Strong list set to none. You can still search if you have weak subjects.", "info");
      return;
    }

    if (myWeakSubjects.includes(value)) {
      showToast("This subject is already in your weak list.", "warning");
      return;
    }

    if (!myStrongSubjects.includes(value)) {
      myStrongSubjects.push(value);
    }

    strongSelect.value = "";
  }

  studyListIsSaved = false;
  studyListHasLocalChanges = true;

  stopSavedMatchRefresh();
  renderProfileList();
  renderNoSearchState();
}
function removeSubject(subject, type) {
  if (type === "weak") {
    myWeakSubjects = myWeakSubjects.filter(item => item !== subject);
  } else {
    myStrongSubjects = myStrongSubjects.filter(item => item !== subject);
  }

  studyListIsSaved = false;
  studyListHasLocalChanges = true;

  stopSavedMatchRefresh();
  renderProfileList();
  renderNoSearchState();
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
  if (!requireLogin("Please login to build your study list.")) return;

  if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
    studyListIsSaved = false;
    showToast("Add at least one weak or strong subject before saving your list.", "warning");
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      studyListIsSaved = false;
      showToast(data.message || "Could not save your list.", "error");
      return;
    }

    myWeakSubjects = cleanSubjectList(data.profile.weakSubjects);
    myStrongSubjects = cleanSubjectList(data.profile.strongSubjects);

    studyListIsSaved = myWeakSubjects.length > 0 || myStrongSubjects.length > 0;
    studyListHasLocalChanges = false;

    stopSavedMatchRefresh();

    renderProfileList();
    renderNoSearchState();

    showToast("Study list saved. Now search for matches.", "success");
  } catch (error) {
    console.error("Save study list error:", error);
    studyListIsSaved = false;
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not clear list.", "error");
      return;
    }

    myWeakSubjects = [];
    myStrongSubjects = [];
    selectedWeakSubject = "";
    selectedStrongSubject = "";
    studyListIsSaved = false;
    studyListHasLocalChanges = false;

    stopSavedMatchRefresh();

    renderProfileList();
    renderNoSearchState();

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

 const rawSelectedWeakSubject = String(weakSelect.value || "").trim();
const rawSelectedStrongSubject = String(strongSelect.value || "").trim();

const weakSelectedNone = rawSelectedWeakSubject.toLowerCase() === "none";
const strongSelectedNone = rawSelectedStrongSubject.toLowerCase() === "none";

selectedWeakSubject = normalizeDropdownSubject(rawSelectedWeakSubject);
selectedStrongSubject = normalizeDropdownSubject(rawSelectedStrongSubject);

if (weakSelectedNone) {
  myWeakSubjects = [];
  weakSelect.value = "";
}

if (strongSelectedNone) {
  myStrongSubjects = [];
  strongSelect.value = "";
}

  if (selectedWeakSubject) {
    if (myStrongSubjects.includes(selectedWeakSubject)) {
      showToast("Weak subject cannot already be in your strong list.", "warning");
      return;
    }

    if (!myWeakSubjects.includes(selectedWeakSubject)) {
      myWeakSubjects.push(selectedWeakSubject);
    }

    weakSelect.value = "";
  }

  if (selectedStrongSubject) {
    if (myWeakSubjects.includes(selectedStrongSubject)) {
      showToast("Strong subject cannot already be in your weak list.", "warning");
      return;
    }

    if (!myStrongSubjects.includes(selectedStrongSubject)) {
      myStrongSubjects.push(selectedStrongSubject);
    }

    strongSelect.value = "";
  }

  if (selectedWeakSubject || selectedStrongSubject) {
    studyListIsSaved = false;
    studyListHasLocalChanges = true;
  }

  renderProfileList();

    if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
  showToast("Add at least one weak subject or one strong subject before searching.", "warning");
  renderNoSearchState();
  return;
    }

  renderLoadingMatches();

  try {
    const response = await fetch("/api/matching/search", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        weakSubjects: myWeakSubjects,
        strongSubjects: myStrongSubjects
      })
    });

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      currentMatches = [];
      lastMatchesJSON = "";
      matchingSearchHasRun = true;
      renderMatches();
      showToast(data.message || "Could not search matches.", "error");
      return;
    }

    currentMatches = Array.isArray(data.matches) ? data.matches : [];
    lastMatchesJSON = JSON.stringify(currentMatches);
    matchingSearchHasRun = true;

    saveMatchingSearchState(myWeakSubjects, myStrongSubjects);
    renderMatches();
    startMatchingLiveRefresh();

    if (currentMatches.length === 0) {
      showToast("No matching students found yet.", "warning");
    } else {
      showToast("Matching students loaded.", "success");
    }
  } catch (error) {
    console.error("Search matches error:", error);
    currentMatches = [];
    lastMatchesJSON = "";
    matchingSearchHasRun = true;
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

function renderNoSearchState() {
  const matchesGrid = document.getElementById("matchesGrid");

  currentMatches = [];
  lastMatchesJSON = "";
  matchingSearchHasRun = false;

  if (!matchesGrid) return;

  matchesGrid.innerHTML = `
    <div class="empty-state-card">
      <div class="empty-icon">🔎</div>
      <h3>No search yet</h3>
      <p>Add subjects to your study list, save it, then search for matches.</p>
    </div>
  `;
}

function renderMatches() {
  const matchesGrid = document.getElementById("matchesGrid");

  if (!matchesGrid) return;

  if (!matchingSearchHasRun) {
    renderNoSearchState();
    return;
  }

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

    const canHelpMe = Array.isArray(match.canHelpMe)
      ? match.canHelpMe
      : [];

    const iCanHelpThem = Array.isArray(match.iCanHelpThem)
      ? match.iCanHelpThem
      : [];

       const requestWeakSubject = canHelpMe[0] || "";
    const requestStrongSubject = iCanHelpThem[0] || "";

    let requestButtonText = `Send Request to ${firstName}`;

    if (requestWeakSubject && !requestStrongSubject) {
      requestButtonText = `Ask ${firstName} for Help`;
    }

    if (!requestWeakSubject && requestStrongSubject) {
      requestButtonText = `Offer Help to ${firstName}`;
    }

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
        </div>

        <button
          class="btn-match"
          onclick="sendMatchRequest('${escapeJS(match.profileId)}', '${escapeJS(name)}', '${escapeJS(requestWeakSubject)}', '${escapeJS(requestStrongSubject)}')"
        >
         ${escapeHTML(requestButtonText)}
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

    if (!senderWeakSubject && !senderStrongSubject) {
    showToast("This match is missing a subject.", "warning");
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not send match request.", "error");
      return;
    }

    showToast(data.message || `Match request sent to ${name}.`, "success");
    await loadMyRequests();
    await refreshSavedMatches(true);
  } catch (error) {
    console.error("Send match request error:", error);
    showToast("Server error while sending match request.", "error");
  }
}

async function loadMyRequests() {
  const requestsGrid = document.getElementById("requestsGrid");

  if (!requestsGrid) return false;

  if (!isLoggedIn()) {
    renderEmptyRequests();
    return false;
  }

  try {
    const response = await fetch("/api/matching/requests", {
      cache: "no-store"
    });

    if (response.status === 404) {
      renderEmptyRequests();
      return true;
    }

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return false;
    }

    if (!response.ok || !data.success) {
      renderEmptyRequests();
      return true;
    }

    renderRequests(data.requests || []);
    return true;
  } catch (error) {
    console.error("Load requests error:", error);
    renderEmptyRequests();
    return true;
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
    const direction = request.direction || "sent";
    const isSent = direction === "sent";
    const avatarLetter = otherName.charAt(0).toUpperCase();

    const neededSubject = normalizeDropdownSubject(request.senderWeakSubject || "");
    const offeredSubject = normalizeDropdownSubject(request.senderStrongSubject || "");

    const subjectRows = [];

    if (neededSubject) {
      subjectRows.push(`
        <div class="subject-row">
          <h5>${isSent ? "You need help with" : "They need help with"}</h5>
          <div class="small-tags">
            <span class="small-tag">${escapeHTML(neededSubject)}</span>
          </div>
        </div>
      `);
    }

    if (offeredSubject) {
      subjectRows.push(`
        <div class="subject-row">
          <h5>${isSent ? "You can help with" : "They can help with"}</h5>
          <div class="small-tags">
            <span class="small-tag">${escapeHTML(offeredSubject)}</span>
          </div>
        </div>
      `);
    }

    if (subjectRows.length === 0) {
      subjectRows.push(`
        <div class="subject-row">
          <h5>Subject</h5>
          <div class="small-tags">
            <span class="small-tag empty-tag">No subject selected</span>
          </div>
        </div>
      `);
    }

    let actionHTML = "";

    if (["accepted", "rescheduled", "matched"].includes(status) && request.chat) {
      actionHTML = `
        <button class="btn-match" onclick="openMatchingChatPopup('${escapeJS(request.chat)}', '${escapeJS(otherName)}')">
          Open Chat
        </button>
      `;
    } else if (status === "pending" && direction === "sent") {
      actionHTML = `
        <button class="btn-match cancel-request-btn" onclick="cancelMatchRequest('${escapeJS(request._id)}')">
          Cancel Request
        </button>
      `;
    } else if (status === "pending" && direction === "received") {
      actionHTML = `
        <div class="request-actions">
          <button class="btn-match accept-request-btn" onclick="acceptMatchRequest('${escapeJS(request._id)}', '${escapeJS(otherName)}')">
            Accept
          </button>

          <button class="btn-match reject-request-btn" onclick="rejectMatchRequest('${escapeJS(request._id)}')">
            Reject
          </button>
        </div>
      `;
    } else {
      actionHTML = `
        <button class="btn-match" disabled>
          ${escapeHTML(status)}
        </button>
      `;
    }

    return `
      <div class="buddy-card">
        <div class="buddy-top">
          <div class="buddy-avatar">${escapeHTML(avatarLetter)}</div>

          <div class="buddy-name">
            <h3>${escapeHTML(isSent ? `To ${otherName}` : `From ${otherName}`)}</h3>
          </div>

          <span class="match-score">${escapeHTML(status)}</span>
        </div>

        <div class="buddy-subjects">
          ${subjectRows.join("")}
        </div>

        ${actionHTML}
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not cancel request.", "error");
      return;
    }

    showToast(data.message || "Request cancelled.", "success");
    await loadMyRequests();
    await refreshSavedMatches(true);
  } catch (error) {
    console.error("Cancel match request error:", error);
    showToast("Server error while cancelling request.", "error");
  }
}

async function acceptMatchRequest(requestId, otherName = "Study Partner") {
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not accept request.", "error");
      return;
    }

    showToast(data.message || "Request accepted.", "success");

    await loadMyRequests();

    if (data.chatId) {
      openMatchingChatPopup(data.chatId, otherName);
      return;
    }
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

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not reject request.", "error");
      return;
    }

    showToast(data.message || "Request rejected.", "success");
    await loadMyRequests();
    await refreshSavedMatches(true);
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
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}

function setMatchingLoggedOutFlag() {
  if (window.MATCHING_PAGE_DATA) {
    window.MATCHING_PAGE_DATA.isLoggedIn = false;
  }
}

async function readJSONOrLogout(response) {
  if (response.status === 401 || response.status === 403 || response.redirected) {
    setMatchingLoggedOutFlag();
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    setMatchingLoggedOutFlag();
    return null;
  }

  return response.json();
}

function resetMatchingPageAfterLogout() {
  myWeakSubjects = [];
  myStrongSubjects = [];
  selectedWeakSubject = "";
  selectedStrongSubject = "";
  studyListIsSaved = false;
  studyListHasLocalChanges = false;

  stopSavedMatchRefresh();
  renderProfileList();
  renderNoSearchState();
  renderEmptyRequests();

  if (typeof closeMatchingChatPopup === "function") {
    closeMatchingChatPopup();
  }
}

function stopSavedMatchRefresh() {
  clearInterval(matchingLiveRefreshTimer);
  matchingLiveRefreshTimer = null;

  sessionStorage.removeItem(MATCHING_LAST_SEARCH_KEY);

  currentMatches = [];
  lastMatchesJSON = "";
  matchingSearchHasRun = false;
}

function saveMatchingSearchState(weakSubjects = myWeakSubjects, strongSubjects = myStrongSubjects) {
  if (!isLoggedIn()) return;

  const cleanWeakSubjects = cleanSubjectList(weakSubjects);
  const cleanStrongSubjects = cleanSubjectList(strongSubjects);

  if (cleanWeakSubjects.length === 0 && cleanStrongSubjects.length === 0) {
    return;
  }

  sessionStorage.setItem(
    MATCHING_LAST_SEARCH_KEY,
    JSON.stringify({
      weakSubjects: cleanWeakSubjects,
      strongSubjects: cleanStrongSubjects,
      selectedWeakSubject: normalizeDropdownSubject(selectedWeakSubject),
      selectedStrongSubject: normalizeDropdownSubject(selectedStrongSubject),
      savedAt: Date.now()
    })
  );
}

function getMatchingSearchState() {
  try {
    const rawData = sessionStorage.getItem(MATCHING_LAST_SEARCH_KEY);

    if (!rawData) return null;

    const data = JSON.parse(rawData);

    const weakSubjects = cleanSubjectList(data.weakSubjects);
    const strongSubjects = cleanSubjectList(data.strongSubjects);

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      return null;
    }

    return {
      weakSubjects,
      strongSubjects,
      selectedWeakSubject: normalizeDropdownSubject(data.selectedWeakSubject || ""),
      selectedStrongSubject: normalizeDropdownSubject(data.selectedStrongSubject || "")
    };
  } catch (error) {
    console.error("Read matching search state error:", error);
    return null;
  }
}

function restoreMatchingSearchState() {
  const savedSearch = getMatchingSearchState();

  if (!savedSearch) {
    return false;
  }

  selectedWeakSubject = savedSearch.selectedWeakSubject || "";
  selectedStrongSubject = savedSearch.selectedStrongSubject || "";

  return true;
}

function clearMatchingSearchState() {
  stopSavedMatchRefresh();
}

async function refreshSavedMatches(silent = true) {
  if (!isLoggedIn()) {
    resetMatchingPageAfterLogout();
    return;
  }

  const savedSearch = getMatchingSearchState();

  if (!savedSearch) return;

  selectedWeakSubject = savedSearch.selectedWeakSubject || "";
  selectedStrongSubject = savedSearch.selectedStrongSubject || "";

  try {
    const response = await fetch("/api/matching/search", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        weakSubjects: savedSearch.weakSubjects,
        strongSubjects: savedSearch.strongSubjects
      })
    });

    const data = await readJSONOrLogout(response);

    if (!data) {
      resetMatchingPageAfterLogout();
      return;
    }

    if (!response.ok || !data.success) {
      if (!silent) {
        showToast(data.message || "Could not refresh matches.", "error");
      }

      return;
    }

    const freshMatches = Array.isArray(data.matches) ? data.matches : [];
    const freshMatchesJSON = JSON.stringify(freshMatches);

    if (freshMatchesJSON !== lastMatchesJSON) {
      currentMatches = freshMatches;
      lastMatchesJSON = freshMatchesJSON;
      matchingSearchHasRun = true;
      renderMatches();
    }
  } catch (error) {
    console.error("Live refresh matches error:", error);

    if (!silent) {
      showToast("Server error while refreshing matches.", "error");
    }
  }
}

function startMatchingLiveRefresh() {
  clearInterval(matchingLiveRefreshTimer);

  matchingLiveRefreshTimer = setInterval(async () => {
    if (!isLoggedIn()) {
      resetMatchingPageAfterLogout();
      return;
    }

    const stillLoggedIn = await loadMyRequests();

    if (stillLoggedIn) {
      await refreshSavedMatches(true);
    }
  }, 5000);
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSubjects();

  const stillLoggedIn = await loadMyProfile({ force: true });

  if (stillLoggedIn) {
    restoreMatchingSearchState();
    await loadMyRequests();
    await refreshSavedMatches(true);
    startMatchingLiveRefresh();
  }
});

window.addEventListener("pageshow", async () => {
  const stillLoggedIn = await loadMyProfile();

  if (stillLoggedIn) {
    restoreMatchingSearchState();
    await loadMyRequests();
    await refreshSavedMatches(true);
    startMatchingLiveRefresh();
  }
});

document.addEventListener("visibilitychange", async () => {
  if (document.hidden) return;

  const stillLoggedIn = await loadMyRequests();

  if (stillLoggedIn) {
    await refreshSavedMatches(true);
  }
});

let activePopupChatId = "";
let popupCurrentUserId = "";
let popupCurrentRequest = null;
let popupLastMessagesJSON = "";
let popupRefreshTimer = null;

function openMatchingChatPopup(chatIdValue, partnerNameValue = "Study Partner") {
  if (!chatIdValue) return;

  activePopupChatId = String(chatIdValue);
  popupLastMessagesJSON = "";

  const popup = document.getElementById("matchingChatPopup");
  const mini = document.getElementById("matchingChatMini");
  const title = document.getElementById("popupChatPartnerName");
  const avatar = document.getElementById("popupChatAvatar");
  const input = document.getElementById("popupMessageInput");

  const cleanName = String(partnerNameValue || "Study Partner").trim() || "Study Partner";

  if (title) title.textContent = cleanName;
  if (avatar) avatar.textContent = cleanName.charAt(0).toUpperCase();

  if (mini) mini.classList.add("hidden");
  if (popup) popup.classList.remove("hidden");

  loadPopupMessages();
  startPopupRefresh();

  setTimeout(() => {
    if (input) input.focus();
  }, 150);
}

function startPopupRefresh() {
  clearInterval(popupRefreshTimer);

  popupRefreshTimer = setInterval(() => {
    if (activePopupChatId) {
      loadPopupMessages();
    }
  }, 3000);
}

function closeMatchingChatPopup(event) {
  if (event) event.stopPropagation();

  activePopupChatId = "";
  popupCurrentUserId = "";
  popupCurrentRequest = null;
  popupLastMessagesJSON = "";

  clearInterval(popupRefreshTimer);

  const popup = document.getElementById("matchingChatPopup");
  const mini = document.getElementById("matchingChatMini");
  const messagesBox = document.getElementById("popupMessagesBox");
  const schedulePanel = document.getElementById("popupSchedulePanel");
  const messageInput = document.getElementById("popupMessageInput");
  const scheduleInput = document.getElementById("popupScheduleDateTime");

  if (popup) popup.classList.add("hidden");
  if (mini) mini.classList.add("hidden");
  if (schedulePanel) schedulePanel.classList.add("hidden");

  if (messagesBox) {
    messagesBox.innerHTML = `<div class="popup-empty-chat">Open a chat to start messaging.</div>`;
  }

  if (messageInput) messageInput.value = "";
  if (scheduleInput) scheduleInput.value = "";
}

function minimizeMatchingChatPopup(event) {
  if (event) event.stopPropagation();

  const popup = document.getElementById("matchingChatPopup");
  const mini = document.getElementById("matchingChatMini");

  if (popup) popup.classList.add("hidden");
  if (mini && activePopupChatId) mini.classList.remove("hidden");
}

function expandMatchingChatPopup() {
  const popup = document.getElementById("matchingChatPopup");
  const mini = document.getElementById("matchingChatMini");

  if (mini) mini.classList.add("hidden");

  if (popup && activePopupChatId) {
    popup.classList.remove("hidden");
    loadPopupMessages();
  }
}

async function loadPopupMessages() {
  if (!activePopupChatId) return;

  const messagesBox = document.getElementById("popupMessagesBox");
  if (!messagesBox) return;

  try {
    const response = await fetch(`/api/matching/chat/${activePopupChatId}/messages`, {
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      messagesBox.innerHTML = `
        <div class="popup-empty-chat">
          ${escapeHTML(data.message || "Could not load messages.")}
        </div>
      `;
      return;
    }

    popupCurrentUserId = data.currentUserId || "";
    popupCurrentRequest = data.request || null;

    const messages = Array.isArray(data.messages) ? data.messages : [];
    const requestInfo = popupCurrentRequest ? JSON.stringify(popupCurrentRequest) : "";
    const newMessagesJSON = JSON.stringify(messages) + requestInfo;

    if (newMessagesJSON === popupLastMessagesJSON) {
      return;
    }

    popupLastMessagesJSON = newMessagesJSON;

    renderPopupMessages(messages);
  } catch (error) {
    console.error("Popup chat load error:", error);

    messagesBox.innerHTML = `
      <div class="popup-empty-chat">
        Server error while loading messages.
      </div>
    `;
  }
}

function updatePopupChatLockState() {
  const form = document.getElementById("popupChatForm");
  const input = document.getElementById("popupMessageInput");
  const sendButton = document.querySelector(".popup-send-btn");
  const scheduleButton = document.querySelector(".popup-schedule-btn");
  const matchNowButton = document.querySelector(".popup-match-now-btn");
  const schedulePanel = document.getElementById("popupSchedulePanel");

  const isLocked = Boolean(
    popupCurrentRequest &&
    (
      popupCurrentRequest.status === "matched" ||
      popupCurrentRequest.emailSentAt
    )
  );

  if (input) {
    input.disabled = isLocked;
    input.placeholder = isLocked
      ? "Chat locked. Meeting link was already sent."
      : "Write your message...";
  }

  if (sendButton) {
    sendButton.disabled = isLocked;
  }

  if (scheduleButton) {
    scheduleButton.disabled = isLocked;
  }

  if (matchNowButton) {
    matchNowButton.disabled = isLocked;
  }

  if (form) {
    form.classList.toggle("chat-locked", isLocked);
  }

  if (schedulePanel && isLocked) {
    schedulePanel.classList.add("hidden");
  }
}

function renderPopupMessages(messages) {
  const messagesBox = document.getElementById("popupMessagesBox");
  if (!messagesBox) return;

  updatePopupChatLockState();

  let statusHTML = "";

async function sendPopupMessage(event) {
  event.preventDefault();

  if (!activePopupChatId) return;

  const input = document.getElementById("popupMessageInput");
  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  input.disabled = true;

  try {
    const response = await fetch(`/api/matching/chat/${activePopupChatId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not send message.", "error");
      return;
    }

    input.value = "";
    await loadPopupMessages();
  } catch (error) {
    console.error("Popup send message error:", error);
    showToast("Server error while sending message.", "error");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function showPopupSchedulePanel() {
  const panel = document.getElementById("popupSchedulePanel");

  if (panel) {
    panel.classList.remove("hidden");
  }
}

function hidePopupSchedulePanel() {
  const panel = document.getElementById("popupSchedulePanel");

  if (panel) {
    panel.classList.add("hidden");
  }
}

async function submitPopupSchedule() {
  if (!activePopupChatId) return;

  const input = document.getElementById("popupScheduleDateTime");
  if (!input) return;

  if (!input.value) {
    showToast("Please choose a meeting date and time.", "warning");
    return;
  }

  const selectedDate = new Date(input.value);

  if (Number.isNaN(selectedDate.getTime())) {
    showToast("Invalid date and time.", "error");
    return;
  }

  try {
    const response = await fetch(`/api/matching/chat/${activePopupChatId}/schedule`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scheduledAt: selectedDate.toISOString()
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not schedule meeting.", "error");
      return;
    }

    showToast(data.message || "Meeting scheduled.", "success");

    hidePopupSchedulePanel();
    input.value = "";

    await loadPopupMessages();
    await loadMyRequests();
  } catch (error) {
    console.error("Popup schedule error:", error);
    showToast("Server error while scheduling meeting.", "error");
  }
}

async function popupMatchNow() {
  if (!activePopupChatId) return;

  const confirmStart = confirm("Send the meeting link email to both students now?");

  if (!confirmStart) return;

  try {
    const response = await fetch(`/api/matching/chat/${activePopupChatId}/match-now`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not start match now.", "error");
      return;
    }

    showToast(data.message || "Meeting email sent.", "success");

    await loadPopupMessages();
    await loadMyRequests();
  } catch (error) {
    console.error("Popup match now error:", error);
    showToast("Server error while starting match now.", "error");
  }
}

function formatPopupTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPopupFullDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const popupChatForm = document.getElementById("popupChatForm");

  if (popupChatForm) {
    popupChatForm.addEventListener("submit", sendPopupMessage);
  }
}); 