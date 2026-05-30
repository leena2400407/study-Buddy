const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");

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
    const data = await fetchAdminData("/admin/api/users");
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
                <button class="danger-btn" onclick="deleteUser('${user._id}')">
                  Delete
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
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
    const data = await fetchAdminData("/admin/api/study-profiles");
    const profiles = data.profiles || [];

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
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadEventRegistrations() {
  const box = document.getElementById("registrationsTable");

  try {
    const data = await fetchAdminData("/admin/api/event-registrations");
    const registrations = data.registrations || [];

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
          </tr>
        </thead>
        <tbody>
          ${registrations.map(reg => `
            <tr>
              <td>${escapeHTML(reg.fullName || "-")}</td>
              <td>${escapeHTML(reg.email || "-")}</td>
              <td>${escapeHTML(reg.university || "-")}</td>
              <td>${escapeHTML(reg.tournamentName || "-")}</td>
              <td>${escapeHTML(reg.teamName || "-")}</td>
              <td>
                ${(reg.players || []).map(player => `
                  <div>${escapeHTML(player.name || "-")} - ${escapeHTML(player.email || "-")}</div>
                `).join("") || "-"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadGameScores() {
  const box = document.getElementById("scoresTable");

  try {
    const data = await fetchAdminData("/admin/api/game-scores");
    const scores = data.scores || [];

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
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadEvents() {
  const box = document.getElementById("eventsTable");

  try {
    const data = await fetchAdminData("/admin/api/events");
    const events = data.events || [];

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
                <button class="refresh-btn" onclick='editEvent(${JSON.stringify(event)})'>Edit</button>
                <button class="danger-btn" onclick="deleteEvent('${event._id}')">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    box.innerHTML = `<div class="empty-box">${escapeHTML(error.message)}</div>`;
  }
}

async function loadUniversities() {
  const box = document.getElementById("universitiesTable");

  try {
    const data = await fetchAdminData("/admin/api/universities");
    const universities = data.universities || [];

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

async function saveUser(event) {
  event.preventDefault();

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

  try {
    const response = await fetch("/admin/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showToast(data.message || "Could not create user.", "error");
      return;
    }

    showToast(data.message, "success");
    resetUserForm();
    loadUsers();
    loadOverview();

  } catch (error) {
    showToast("Server error while creating user.", "error");
  }
}

function resetUserForm() {
  document.getElementById("userForm").reset();
}

async function loadResources() {
  const box = document.getElementById("resourcesTable");

  try {
    const data = await fetchAdminData("/admin/api/resources");
    const categories = data.categories || [];

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