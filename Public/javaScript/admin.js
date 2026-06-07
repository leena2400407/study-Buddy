const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");


const adminLimit = 5;

const adminPages = {
  users: 1,
  matching: 1,
  registrations: 1,
  scores: 1,
  events: 1,
  universities: 1,
  resources: 1
};

function renderPagination(tabName, pagination, loadFunctionName) {
  if (!pagination) return "";

  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;

  return `
    <div class="admin-pagination">
      <button 
        class="refresh-btn"
        ${currentPage <= 1 ? "disabled" : ""}
        onclick="changeAdminPage('${tabName}', -1, ${totalPages}, '${loadFunctionName}')"
      >
        Previous
      </button>

      <span>
        Page ${currentPage} of ${totalPages}
      </span>

      <button 
        class="refresh-btn"
        ${currentPage >= totalPages ? "disabled" : ""}
        onclick="changeAdminPage('${tabName}', 1, ${totalPages}, '${loadFunctionName}')"
      >
        Next
      </button>
    </div>
  `;
}

function changeAdminPage(tabName, direction, totalPages, loadFunctionName) {
  const nextPage = adminPages[tabName] + direction;

  if (nextPage < 1 || nextPage > totalPages) return;

  adminPages[tabName] = nextPage;

  if (loadFunctionName === "loadUsers") loadUsers();
  if (loadFunctionName === "loadStudyProfiles") loadStudyProfiles();
  if (loadFunctionName === "loadEventRegistrations") loadEventRegistrations();
  if (loadFunctionName === "loadGameScores") loadGameScores();
  if (loadFunctionName === "loadEvents") loadEvents();
  if (loadFunctionName === "loadUniversities") loadUniversities();
  if (loadFunctionName === "loadResources") loadResources();
}

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    const tabName = button.dataset.tab;

    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabSections.forEach(section => section.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(tabName).classList.add("active");

    loadTabData(tabName);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
});

function loadTabData(tabName) {
  if (tabName === "overview") loadOverview();
  if (tabName === "users") loadUsers();
  if (tabName === "matching") loadStudyProfiles();
  if (tabName === "registrations") loadEventRegistrations();
  if (tabName === "scores") loadGameScores();
  if (tabName === "events") loadEvents();
  if (tabName === "universities") loadUniversities();
  if (tabName === "resources") loadResources();
}

async function fetchAdminData(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

async function loadOverview() {
  const box = document.getElementById("overviewStats");

  try {
    const data = await fetchAdminData("/admin/api/overview");
    const overview = data.overview;

    box.innerHTML = `
    ${statCard("Users", overview.usersCount)}
    ${statCard("Study Profiles", overview.studyProfilesCount)}
    ${statCard("Event Registrations", overview.eventRegistrationsCount)}
    ${statCard("Game Scores", overview.gameScoresCount)}
    ${statCard("Events", overview.eventsCount)}
    ${statCard("Universities", overview.universitiesCount)}
    ${statCard("Resources", overview.resourcesCount)}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

function statCard(title, value) {
  return `
    <div class="stat-card">
      <h3>${escapeHTML(title)}</h3>
      <p>${Number(value) || 0}</p>
    </div>
  `;
}

async function loadUsers() {
  const box = document.getElementById("usersTable");

  try {
    const data = await fetchAdminData(`/admin/api/users?page=${adminPages.users}&limit=${adminLimit}`);
    const users = data.users || [];

    if (users.length === 0) {
      box.innerHTML = `<div class="empty-box">No users found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>University</th>
            <th>Major</th>
            <th>Gender</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${escapeHTML(user.fullName || "-")}</td>
              <td>${escapeHTML(user.username || "-")}</td>
              <td>${escapeHTML(user.email || "-")}</td>
              <td>${escapeHTML(user.university || "-")}</td>
              <td>${escapeHTML(user.major || "-")}</td>
              <td>${escapeHTML(user.gender || "-")}</td>
              <td><span class="badge">${escapeHTML(user.role || "student")}</span></td>
              <td>
              <button class="refresh-btn" onclick='editUser(${JSON.stringify(user)})'>
                Edit
              </button>

              <button class="danger-btn" onclick="deleteUser('${user._id}')">
                Delete
              </button>
            </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${renderPagination("users", data.pagination, "loadUsers")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;

  const payload = {
    fullName: document.getElementById("userFullName").value.trim(),
    username: document.getElementById("userUsername").value.trim(),
    email: document.getElementById("userEmail").value.trim(),
    password: document.getElementById("userPassword").value,
    gender: document.getElementById("userGender").value,
    university: document.getElementById("userUniversity").value.trim(),
    major: document.getElementById("userMajor").value.trim(),
    role: document.getElementById("userRole").value
  };

  const url = userId
    ? `/admin/api/users/${userId}`
    : "/admin/api/users";

  const method = userId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not save user.", "error");
      return;
    }

    showToast(data.message, "success");
    resetUserForm();
    loadUsers();
    loadOverview();

  } catch (error) {
    showToast("Server error while saving user.", "error");
  }
}

function editUser(user) {
  document.getElementById("userId").value = user._id || "";
  document.getElementById("userFullName").value = user.fullName || "";
  document.getElementById("userUsername").value = user.username || "";
  document.getElementById("userEmail").value = user.email || "";
  document.getElementById("userPassword").value = "";
  document.getElementById("userGender").value = String(user.gender || "").toLowerCase();
  document.getElementById("userUniversity").value = user.university || "";
  document.getElementById("userMajor").value = user.major || "";
  document.getElementById("userRole").value = user.role || "student";

  const submitBtn = document.getElementById("userSubmitBtn");

  if (submitBtn) {
    submitBtn.innerText = "Update User";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteUser(userId) {
  const confirmDelete = confirm(
    "Are you sure you want to delete this user? This will also delete their study profile, game score, and event registrations."
  );

  if (!confirmDelete) return;

  try {
    const response = await fetch(`/admin/users/${userId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not delete user.", "error");
      return;
    }

    showToast("User deleted successfully.", "success");

    loadUsers();
    loadOverview();

  } catch (error) {
    showToast("Server error while deleting user.", "error");
  }
}

async function loadStudyProfiles() {
  const box = document.getElementById("profilesTable");

  try {
    const data = await fetchAdminData(`/admin/api/study-profiles?page=${adminPages.matching}&limit=${adminLimit}`);
    const profiles = Array.isArray(data.profiles) ? data.profiles : [];

    if (profiles.length === 0) {
      box.innerHTML = `<div class="empty-box">No study profiles found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>University</th>
            <th>Major</th>
            <th>Weak Subjects</th>
            <th>Strong Subjects</th>
          </tr>
        </thead>
        <tbody>
          ${profiles.map(profile => `
            <tr>
              <td>${escapeHTML(profile.fullName || "-")}</td>
              <td>${escapeHTML(profile.email || "-")}</td>
              <td>${escapeHTML(profile.university || "-")}</td>
              <td>${escapeHTML(profile.major || "-")}</td>
              <td>${renderBadges(profile.weakSubjects)}</td>
              <td>${renderBadges(profile.strongSubjects)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      ${renderPagination("matching", data.pagination, "loadStudyProfiles")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadEventRegistrations() {
  const box = document.getElementById("registrationsTable");

  try {
    const data = await fetchAdminData(`/admin/api/event-registrations?page=${adminPages.registrations}&limit=${adminLimit}`);
    const registrations = Array.isArray(data.registrations) ? data.registrations : [];

    if (registrations.length === 0) {
      box.innerHTML = `<div class="empty-box">No event registrations found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Leader</th>
            <th>Email</th>
            <th>University</th>
            <th>Tournament</th>
            <th>Team</th>
            <th>Players</th>
            <th>Bracket Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${registrations.map((reg, index) => `
            <tr>
              <td>${escapeHTML(reg.fullName || "-")}</td>
              <td>${escapeHTML(reg.email || "-")}</td>
              <td>${escapeHTML(reg.university || "-")}</td>
              <td>${escapeHTML(reg.tournamentName || "-")}</td>
              <td>
                <span class="badge">${escapeHTML(reg.teamName || "-")}</span>
              </td>
              <td>
                ${(reg.players || []).map(player => `
                  <div>
                    ${escapeHTML(player.name || "-")}
                    ${player.email ? `- ${escapeHTML(player.email)}` : ""}
                  </div>
                `).join("") || "-"}
              </td>
              <td>
                ${
                  index < 8
                    ? `<span class="badge accepted-badge">In Bracket</span>`
                    : `<span class="badge waiting-badge">Waiting List</span>`
                }
              </td>
              <td>
                <button class="danger-btn" onclick="deleteEventRegistration('${reg._id}')">
                  Remove Team
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      ${renderPagination("registrations", data.pagination, "loadEventRegistrations")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function deleteEventRegistration(registrationId) {
  const confirmDelete = confirm(
    "Remove this team from the tournament registrations?"
  );

  if (!confirmDelete) return;

  try {
    const response = await fetch(`/admin/api/event-registrations/${registrationId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not remove team.", "error");
      return;
    }

    showToast("Team removed successfully.", "success");

    loadEventRegistrations();
    loadOverview();

  } catch (error) {
    showToast("Server error while removing team.", "error");
  }
}

async function loadEvents() {
  const box = document.getElementById("eventsTable");

  try {
    const data = await fetchAdminData(`/admin/api/events?page=${adminPages.events}&limit=${adminLimit}`);
    const events = Array.isArray(data.events) ? data.events : [];

    if (events.length === 0) {
      box.innerHTML = `<div class="empty-box">No events found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Button</th>
            <th>Max Players</th>
            <th>Image</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${events.map(event => `
            <tr>
              <td>${escapeHTML(event.title || "-")}</td>
              <td>${escapeHTML(event.category || "-")}</td>
              <td>${escapeHTML(event.buttonType || "-")}</td>
              <td>${escapeHTML(event.maxPlayers || 0)}</td>
              <td>${escapeHTML(event.imagePath || "-")}</td>
              <td>
              <button class="refresh-btn" onclick='editEvent(${JSON.stringify(event)})'>
                Edit
              </button>

              <button class="danger-btn" onclick="deleteEvent('${event._id}')">
                Delete
              </button>

               ${
                  ["sports", "football", "padel"].includes(String(event.category || "").toLowerCase())
                  ? `
                  <button class="refresh-btn" onclick="openBracketEditor('${event._id}')">
                    Bracket
                  </button>
                  `
                : ""
                }
            </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      ${renderPagination("events", data.pagination, "loadEvents")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadGameScores() {
  const box = document.getElementById("scoresTable");

  try {
    const data = await fetchAdminData(`/admin/api/game-scores?page=${adminPages.scores}&limit=${adminLimit}`);    const scores = data.scores || [];

    if (scores.length === 0) {
      box.innerHTML = `<div class="empty-box">No game scores found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${scores.map(score => `
            <tr>
              <td>${escapeHTML(score.name || "-")}</td>
              <td>${escapeHTML(score.score || 0)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${renderPagination("scores", data.pagination, "loadGameScores")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadUniversities() {
  const box = document.getElementById("universitiesTable");

  try {
    const data = await fetchAdminData(`/admin/api/universities?page=${adminPages.universities}&limit=${adminLimit}`);    const universities = data.universities || [];

    if (universities.length === 0) {
      box.innerHTML = `<div class="empty-box">No universities found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Short Name</th>
            <th>Location</th>
            <th>Image</th>
            <th>Portal</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${universities.map(uni => `
            <tr>
              <td>${escapeHTML(uni.name || "-")}</td>
              <td>${escapeHTML(uni.shortName || "-")}</td>
              <td>${escapeHTML(uni.location || "-")}</td>
              <td>${escapeHTML(uni.imagePath || "-")}</td>
              <td>${escapeHTML(uni.portalLink || "-")}</td>
              <td>
                <button class="refresh-btn" onclick='editUniversity(${JSON.stringify(uni)})'>Edit</button>
                <button class="danger-btn" onclick="deleteUniversity('${uni._id}')">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${renderPagination("universities", data.pagination, "loadUniversities")}
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}
function renderBadges(items) {
  if (!items || items.length === 0) {
    return "-";
  }

  return items.map(item => `
    <span class="badge">${escapeHTML(item)}</span>
  `).join("");
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  const eventForm = document.getElementById("eventForm");
  const universityForm = document.getElementById("universityForm");
  const userForm = document.getElementById("userForm");
  const resourceForm = document.getElementById("resourceForm");

  if (eventForm) {
    eventForm.addEventListener("submit", saveEvent);
  }

  if (universityForm) {
    universityForm.addEventListener("submit", saveUniversity);
  }

  if (userForm) {
  userForm.addEventListener("submit", saveUser);
}

if (resourceForm) {
  resourceForm.addEventListener("submit", saveResource);
}
});

async function saveEvent(event) {
  event.preventDefault();

  const eventId = document.getElementById("eventId").value;

  const payload = {
    title: document.getElementById("eventTitle").value.trim(),
    category: document.getElementById("eventCategory").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
    imagePath: document.getElementById("eventImagePath").value.trim(),
    buttonType: document.getElementById("eventButtonType").value,
    detailsLink: document.getElementById("eventDetailsLink").value.trim(),
    maxPlayers: document.getElementById("eventMaxPlayers").value
  };

  const url = eventId
    ? `/admin/api/events/${eventId}`
    : "/admin/api/events";

  const method = eventId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not save event.", "error");
      return;
    }

    showToast(data.message, "success");
    resetEventForm();
    loadEvents();
    loadOverview();

  } catch (error) {
    showToast("Server error while saving event.", "error");
  }
}

function editEvent(event) {
  document.getElementById("eventId").value = event._id || "";
  document.getElementById("eventTitle").value = event.title || "";
  document.getElementById("eventCategory").value = event.category || "";
  document.getElementById("eventDescription").value = event.description || "";
  document.getElementById("eventImagePath").value = event.imagePath || "";
  document.getElementById("eventButtonType").value = event.buttonType || "register";
  document.getElementById("eventDetailsLink").value = event.detailsLink || "";
  document.getElementById("eventMaxPlayers").value = event.maxPlayers || 0;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function resetEventForm() {
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
}

async function deleteEvent(eventId) {
  const confirmDelete = confirm("Delete this event? Related event registrations for this event will also be deleted.");

  if (!confirmDelete) return;

  try {
    const response = await fetch(`/admin/api/events/${eventId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not delete event.", "error");
      return;
    }

    showToast(data.message, "success");
    loadEvents();
    loadOverview();

  } catch (error) {
    showToast("Server error while deleting event.", "error");
  }
}

async function saveUniversity(event) {
  event.preventDefault();

  const universityId = document.getElementById("universityId").value;

  const payload = {
    name: document.getElementById("uniName").value.trim(),
    shortName: document.getElementById("uniShortName").value.trim(),
    imagePath: document.getElementById("uniImagePath").value.trim(),
    overview: document.getElementById("uniOverview").value.trim(),
    location: document.getElementById("uniLocation").value.trim(),
    academics: document.getElementById("uniAcademics").value.trim(),
    whyChoose: document.getElementById("uniWhyChoose").value.trim(),
    studentLife: document.getElementById("uniStudentLife").value.trim(),
    contactInfo: document.getElementById("uniContactInfo").value.trim(),
    portalLink: document.getElementById("uniPortalLink").value.trim()
  };

  const url = universityId
    ? `/admin/api/universities/${universityId}`
    : "/admin/api/universities";

  const method = universityId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not save university.", "error");
      return;
    }

    showToast(data.message, "success");
    resetUniversityForm();
    loadUniversities();
    loadOverview();

  } catch (error) {
    showToast("Server error while saving university.", "error");
  }
}

function editUniversity(uni) {
  document.getElementById("universityId").value = uni._id || "";
  document.getElementById("uniName").value = uni.name || "";
  document.getElementById("uniShortName").value = uni.shortName || "";
  document.getElementById("uniImagePath").value = uni.imagePath || "";
  document.getElementById("uniOverview").value = uni.overview || "";
  document.getElementById("uniLocation").value = uni.location || "";
  document.getElementById("uniAcademics").value = (uni.academics || []).join("\n");
  document.getElementById("uniWhyChoose").value = (uni.whyChoose || []).join("\n");
  document.getElementById("uniStudentLife").value = (uni.studentLife || []).join("\n");
  document.getElementById("uniContactInfo").value = uni.contactInfo || "";
  document.getElementById("uniPortalLink").value = uni.portalLink || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function resetUniversityForm() {
  document.getElementById("universityForm").reset();
  document.getElementById("universityId").value = "";
}

async function deleteUniversity(universityId) {
  const confirmDelete = confirm("Delete this university from Edugate?");

  if (!confirmDelete) return;

  try {
    const response = await fetch(`/admin/api/universities/${universityId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not delete university.", "error");
      return;
    }

    showToast(data.message, "success");
    loadUniversities();
    loadOverview();

  } catch (error) {
    showToast("Server error while deleting university.", "error");
  }
}


function resetUserForm() {
  document.getElementById("userForm").reset();
  document.getElementById("userId").value = "";

  const submitBtn = document.getElementById("userSubmitBtn");

  if (submitBtn) {
    submitBtn.innerText = "Create User";
  }
}

let currentBracketEventId = "";
let currentBracketRegistrations = [];

function ensureBracketModal() {
  let modal = document.getElementById("adminBracketModal");

  if (modal) return modal;

  document.body.insertAdjacentHTML("beforeend", `
    <div id="adminBracketModal" class="admin-bracket-modal hidden">
      <div class="admin-bracket-panel">
        <div class="admin-bracket-head">
          <div>
            <h2 id="adminBracketTitle">Bracket Editor</h2>
            <p id="adminBracketSubtitle">Choose teams and winners</p>
          </div>

          <button type="button" class="admin-bracket-close" onclick="closeBracketEditor()">
            ×
          </button>
        </div>

        <div id="adminBracketBody" class="admin-bracket-body">
          Loading...
        </div>

        <div class="admin-bracket-actions">
          <button type="button" class="refresh-btn" onclick="saveBracketEditor()">
            Save Bracket
          </button>

           <button type="button" class="danger-btn" onclick="resetBracketEditor()">
             Reset Bracket
          </button>

          <button type="button" class="danger-btn" onclick="closeBracketEditor()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `);

  return document.getElementById("adminBracketModal");
}

function closeBracketEditor() {
  const modal = document.getElementById("adminBracketModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  currentBracketEventId = "";
  currentBracketRegistrations = [];
}

async function openBracketEditor(eventId) {
  currentBracketEventId = eventId;

  const modal = ensureBracketModal();
  const body = document.getElementById("adminBracketBody");
  const title = document.getElementById("adminBracketTitle");
  const subtitle = document.getElementById("adminBracketSubtitle");

  modal.classList.remove("hidden");
  body.innerHTML = `<div class="empty-box">Loading bracket...</div>`;

  try {
    const data = await fetchAdminData(`/admin/api/events/${eventId}/bracket`);

    currentBracketRegistrations = Array.isArray(data.registrations)
      ? data.registrations
      : [];

    if (title) {
      title.innerText = data.event?.title || "Bracket Editor";
    }

    if (subtitle) {
      subtitle.innerText = `${currentBracketRegistrations.length} registered team(s)`;
    }

    renderBracketEditor(data.bracket || {});

  } catch (error) {
    body.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

function getBracketTeamOptions(selectedId = "") {
  let html = `<option value="">Empty Slot</option>`;

  currentBracketRegistrations.forEach(reg => {
    const id = String(reg._id || "");
    const teamName = reg.teamName || "Unnamed Team";
    const captainName = reg.captainName || reg.fullName || "";

    html += `
      <option 
        value="${escapeHTML(id)}"
        data-team-name="${escapeHTML(teamName)}"
        ${String(selectedId) === id ? "selected" : ""}
      >
        ${escapeHTML(teamName)}${captainName ? ` - ${escapeHTML(captainName)}` : ""}
      </option>
    `;
  });

  return html;
}

function renderBracketRound(title, key, count, savedRound = []) {
  let html = `
    <div class="admin-bracket-round">
      <h3>${escapeHTML(title)}</h3>
  `;

  for (let i = 0; i < count; i++) {
    const savedSlot = Array.isArray(savedRound)
      ? savedRound.find(item => Number(item.slot) === i + 1) || savedRound[i] || {}
      : {};

    html += `
      <div class="admin-bracket-field">
        <label>${escapeHTML(title)} Slot ${i + 1}</label>

        <select id="bracket-${key}-${i + 1}">
          ${getBracketTeamOptions(savedSlot.registrationId || "")}
        </select>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function renderBracketEditor(bracket) {
  const body = document.getElementById("adminBracketBody");

  body.innerHTML = `
    <div class="admin-bracket-grid">
      ${renderBracketRound("Round of 8", "roundOf8", 8, bracket.roundOf8 || [])}
      ${renderBracketRound("Semi Final", "semiFinal", 4, bracket.semiFinal || [])}
      ${renderBracketRound("Final", "final", 2, bracket.final || [])}

      <div class="admin-bracket-round winner-round">
        <h3>Winner</h3>

        <div class="admin-bracket-field">
          <label>Winner Team</label>

          <select id="bracket-winner">
            ${getBracketTeamOptions(bracket.winner?.registrationId || "")}
          </select>
        </div>
      </div>
    </div>

    <div class="admin-note-box">
      Choose Round of 8 teams, then choose who moves to Semi Final, Final, and Winner.
    </div>
  `;
}

function getSelectedBracketTeam(selectId) {
  const select = document.getElementById(selectId);

  if (!select) {
    return {
      registrationId: null,
      teamName: ""
    };
  }

  const selectedOption = select.options[select.selectedIndex];
  const registrationId = select.value || null;
  const teamName = selectedOption?.dataset?.teamName || "";

  return {
    registrationId,
    teamName
  };
}

function collectBracketRound(key, count) {
  const round = [];

  for (let i = 1; i <= count; i++) {
    const selectedTeam = getSelectedBracketTeam(`bracket-${key}-${i}`);

    round.push({
      slot: i,
      registrationId: selectedTeam.registrationId,
      teamName: selectedTeam.teamName
    });
  }

  return round;
}

async function saveBracketEditor() {
  if (!currentBracketEventId) {
    showToast("No event selected.", "error");
    return;
  }

  const winnerTeam = getSelectedBracketTeam("bracket-winner");

  const payload = {
    roundOf8: collectBracketRound("roundOf8", 8),
    semiFinal: collectBracketRound("semiFinal", 4),
    final: collectBracketRound("final", 2),
    winner: {
      registrationId: winnerTeam.registrationId,
      teamName: winnerTeam.teamName
    }
  };

  try {
    const response = await fetch(`/admin/api/events/${currentBracketEventId}/bracket`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not save bracket.", "error");
      return;
    }

    showToast("Bracket saved successfully.", "success");
    closeBracketEditor();

  } catch (error) {
    showToast("Server error while saving bracket.", "error");
  }
}

async function resetBracketEditor() {
  if (!currentBracketEventId) {
    showToast("No event selected.", "error");
    return;
  }

  const confirmReset = confirm(
    "Reset this bracket? This clears Round of 8, Semi Final, Final, and Winner. It will not delete registrations."
  );

  if (!confirmReset) return;

  try {
    const response = await fetch(`/admin/api/events/${currentBracketEventId}/bracket/reset`, {
      method: "PATCH"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not reset bracket.", "error");
      return;
    }

    showToast("Bracket reset successfully.", "success");
    closeBracketEditor();
    loadEvents();

  } catch (error) {
    showToast("Server error while resetting bracket.", "error");
  }
}

async function loadResources() {
  const box = document.getElementById("resourcesTable");

  try {
    const data = await fetchAdminData(`/admin/api/resources?page=${adminPages.resources}&limit=${adminLimit}`);    const categories = data.categories || [];

    if (categories.length === 0) {
      box.innerHTML = `<div class="empty-box">No resource categories found.</div>`;
      return;
    }

    box.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Tab</th>
            <th>Color</th>
            <th>Resources</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${categories.map(category => `
            <tr>
              <td>${escapeHTML(category.name || "-")}</td>
              <td><span class="badge">${escapeHTML(category.shortName || "-")}</span></td>
              <td>${escapeHTML(category.color || "-")}</td>
              <td>
                ${(category.resources || []).map(resource => `
                  <div class="mini-line">
                    <strong>${escapeHTML(resource.title || "-")}</strong>
                    <br>
                    <span>${escapeHTML(resource.type || "website")}</span>
                    <br>
                    <span>${escapeHTML(resource.url || "-")}</span>
                  </div>
                `).join("") || "-"}
              </td>
              <td>
                <button class="refresh-btn" onclick='editResource(${JSON.stringify(category)})'>Edit</button>
                <button class="danger-btn" onclick="deleteResource('${category._id}')">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      ${renderPagination("resources", data.pagination, "loadResources")}
    `;

  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function saveResource(event) {
  event.preventDefault();

  const resourceId = document.getElementById("resourceId").value;

  const payload = {
    name: document.getElementById("resourceName").value.trim(),
    shortName: document.getElementById("resourceShortName").value.trim(),
    color: document.getElementById("resourceColor").value.trim(),
    resourcesText: document.getElementById("resourceLinksText").value.trim()
  };

  const url = resourceId
    ? `/admin/api/resources/${resourceId}`
    : "/admin/api/resources";

  const method = resourceId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not save resource category.", "error");
      return;
    }

    showToast(data.message, "success");
    resetResourceForm();
    loadResources();
    loadOverview();

  } catch (error) {
    showToast("Server error while saving resource category.", "error");
  }
}

function editResource(category) {
  document.getElementById("resourceId").value = category._id || "";
  document.getElementById("resourceName").value = category.name || "";
  document.getElementById("resourceShortName").value = category.shortName || "";
  document.getElementById("resourceColor").value = category.color || "#0077b6";

  document.getElementById("resourceLinksText").value = (category.resources || [])
    .map(resource => {
      return `${resource.title || ""} | ${resource.url || ""} | ${resource.type || "website"}`;
    })
    .join("\n");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function resetResourceForm() {
  document.getElementById("resourceForm").reset();
  document.getElementById("resourceId").value = "";
}

async function deleteResource(categoryId) {
  const confirmDelete = confirm("Delete this resource category?");

  if (!confirmDelete) return;

  try {
    const response = await fetch(`/admin/api/resources/${categoryId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not delete resource category.", "error");
      return;
    }

    showToast(data.message, "success");
    loadResources();
    loadOverview();

  } catch (error) {
    showToast("Server error while deleting resource category.", "error");
  }
}