document.addEventListener("DOMContentLoaded", function () {
  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observerInstance.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal-item").forEach(el => observer.observe(el));
});

let maxP = 10;
let pendingTournamentName = "";

function openRegistration(e, name, maxPlayersFromDatabase) {
  e.preventDefault();

  if (!window.EVENTS_PAGE_DATA || !window.EVENTS_PAGE_DATA.isLoggedIn) {
    window.location.href = "/login?returnTo=/events";
    return;
  }

  checkBracketBeforeOpeningForm(name, maxPlayersFromDatabase);
}

async function checkBracketBeforeOpeningForm(name, maxPlayersFromDatabase) {
  try {
    const response = await fetch(
      `/api/events/bracket?tournamentName=${encodeURIComponent(name)}`,
      {
        method: "GET",
        credentials: "include"
      }
    );

    const data = await response.json();

    if (data.success && data.registered) {
      showBracketModal(data);
      return;
    }

    openRegistrationForm(name, maxPlayersFromDatabase);

  } catch (error) {
    console.error("Bracket check error:", error);
    openRegistrationForm(name, maxPlayersFromDatabase);
  }
}

function openRegistrationForm(name, maxPlayersFromDatabase) {
  pendingTournamentName = name;
  maxP = Number(maxPlayersFromDatabase) || 10;

  document.getElementById("modal-tournament-name").innerText = name;
  document.getElementById("team-name").value = "";

  document.getElementById("players-container").innerHTML = `
    <div class="form-group player-row captain-row">
      <label>Captain *</label>

      <div class="player-inputs">
        <input type="text" class="player-name" placeholder="Captain Full Name" required>
        <input type="email" class="player-email" placeholder="Captain Email Address" required>
      </div>
    </div>
  `;

  const addBtn = document.querySelector(".add-player-btn");

  if (addBtn) {
    addBtn.style.display = maxP <= 1 ? "none" : "block";
  }

  document.getElementById("registration-modal").classList.remove("hidden");
}

function addPlayer() {
  const container = document.getElementById("players-container");
  const currentPlayers = container.querySelectorAll(".player-row").length;
  const nextPlayerNumber = currentPlayers + 1;

  if (nextPlayerNumber > maxP) return;

  container.insertAdjacentHTML("beforeend", `
    <div class="form-group player-row">
      <div class="player-top-row">
        <label>Player ${nextPlayerNumber}</label>

        <button type="button" class="remove-player-x" onclick="removePlayer(this)">
          ×
        </button>
      </div>

      <div class="player-inputs single-player-input">
        <input type="text" class="player-name" placeholder="Player Full Name" required>
      </div>
    </div>
  `);

  updatePlayerNumbers();
}

function removePlayer(button) {
  const row = button.closest(".player-row");

  if (row) {
    row.remove();
  }

  updatePlayerNumbers();
}

function updatePlayerNumbers() {
  const rows = document.querySelectorAll("#players-container .player-row");

  rows.forEach((row, index) => {
    const label = row.querySelector("label");

    if (!label) return;

    label.innerText = index === 0 ? "Captain *" : `Player ${index + 1}`;
  });

  const addBtn = document.querySelector(".add-player-btn");

  if (addBtn) {
    addBtn.style.display = rows.length >= maxP ? "none" : "block";
  }
}

function closeRegistration() {
  document.getElementById("registration-modal").classList.add("hidden");
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
}

function closeBracketModal() {
  document.getElementById("bracket-modal").classList.add("hidden");
}

function getBlankTeamText(index) {
  return "Empty Slot";
}

function buildBracketTeams(teams) {
  const bracketSize = 8;
  const finalTeams = [];

  for (let i = 0; i < bracketSize; i++) {
    if (teams[i]) {
      finalTeams.push({
        seed: i + 1,
        teamName: teams[i].teamName,
        captainName: teams[i].captainName || "",
        isEmpty: false,
        isMine: teams[i].isMine || false
      });
    } else {
      finalTeams.push({
        seed: i + 1,
        teamName: "Empty Slot",
        captainName: "",
        isEmpty: true,
        isMine: false
      });
    }
  }

  return finalTeams;
}

function createRoundOneHTML(teams) {
  let html = `<div class="bracket-round">
    <h3>Round of 8</h3>
  `;

  for (let i = 0; i < teams.length; i += 2) {
    const teamA = teams[i];
    const teamB = teams[i + 1];

    html += `
      <div class="bracket-match">
        <div class="bracket-team ${teamA.isMine ? "my-team" : ""} ${teamA.isEmpty ? "empty-team" : ""}">
          <span>#${teamA.seed}</span>
          <strong>${teamA.teamName}</strong>
        </div>

        <div class="bracket-team ${teamB.isMine ? "my-team" : ""} ${teamB.isEmpty ? "empty-team" : ""}">
          <span>#${teamB.seed}</span>
          <strong>${teamB.teamName}</strong>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function createEmptyRoundHTML(title, count) {
  let html = `<div class="bracket-round">
    <h3>${title}</h3>
  `;

  for (let i = 0; i < count; i++) {
    html += `
      <div class="bracket-match future-match">
        <div class="bracket-team empty-team">
          <span>Winner</span>
          <strong>Waiting</strong>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function createSavedRoundHTML(title, roundData, count) {
  const savedRound = Array.isArray(roundData) ? roundData : [];

  let html = `<div class="bracket-round">
    <h3>${title}</h3>
  `;

  for (let i = 0; i < count; i++) {
    const item = savedRound.find(slot => Number(slot.slot) === i + 1) || savedRound[i] || {};
    const teamName = item.teamName || "Waiting";

    html += `
      <div class="bracket-match future-match">
        <div class="bracket-team ${teamName === "Waiting" ? "empty-team" : ""}">
          <span>${teamName === "Waiting" ? "Winner" : `#${i + 1}`}</span>
          <strong>${teamName}</strong>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function createWinnerHTML(winner) {
  const winnerName = winner && winner.teamName ? winner.teamName : "Waiting";

  return `
    <div class="bracket-round">
      <h3>Winner</h3>

      <div class="bracket-match future-match winner-match">
        <div class="bracket-team ${winnerName === "Waiting" ? "empty-team" : "winner-team"}">
          <span>${winnerName === "Waiting" ? "Winner" : "Champion"}</span>
          <strong>${winnerName}</strong>
        </div>
      </div>
    </div>
  `;
}

function showBracketModal(data) {
  const eventData = data.event || {};
  const teams = Array.isArray(data.teams) ? data.teams : [];
  const myRegistration = data.myRegistration || null;

  const bracketModal = document.getElementById("bracket-modal");
  const bracketTitle = document.getElementById("bracket-event-title");
  const bracketSubtitle = document.getElementById("bracket-event-subtitle");
  const bracketArea = document.getElementById("bracket-area");
  const bracketMyTeam = document.getElementById("bracket-my-team");
  const bracketTeamCount = document.getElementById("bracket-team-count");
  const locationBtn = document.getElementById("bracket-location-btn");

  if (!bracketModal || !bracketArea) return;

  if (bracketTitle) {
    bracketTitle.innerText = eventData.title || pendingTournamentName || "Tournament Bracket";
  }

  if (bracketSubtitle) {
    bracketSubtitle.innerText = eventData.category || "Knockout Tournament";
  }

  if (bracketMyTeam) {
    bracketMyTeam.innerText = myRegistration ? myRegistration.teamName : "Not registered yet";
  }

  if (bracketTeamCount) {
    bracketTeamCount.innerText = `${teams.length} team${teams.length === 1 ? "" : "s"} registered`;
  }

 const savedBracket = data.bracket || {};

const savedRoundOf8 = Array.isArray(savedBracket.roundOf8)
  ? savedBracket.roundOf8
  : [];

const hasSavedRoundOf8 = savedRoundOf8.some(slot => {
  return slot && slot.teamName;
});

const roundOneTeams = hasSavedRoundOf8
  ? buildBracketTeams(
      savedRoundOf8.map((slot, index) => {
        return {
          seed: index + 1,
          teamName: slot.teamName || "Empty Slot",
          captainName: "",
          isMine: false
        };
      })
    )
  : buildBracketTeams(teams);

  bracketArea.innerHTML = `
  ${createRoundOneHTML(roundOneTeams)}
  ${createSavedRoundHTML("Semi Final", savedBracket.semiFinal, 4)}
  ${createSavedRoundHTML("Final", savedBracket.final, 2)}
  ${createWinnerHTML(savedBracket.winner)}
`;

  if (locationBtn) {
    const link = eventData.detailsLink || "";

    if (link) {
      locationBtn.style.display = "inline-flex";
      locationBtn.onclick = function () {
        window.open(link, "_blank");
      };
    } else {
      locationBtn.style.display = "none";
      locationBtn.onclick = null;
    }
  }

  closeRegistration();
  bracketModal.classList.remove("hidden");
}

async function loadAndShowBracket(tournamentName) {
  const response = await fetch(
    `/api/events/bracket?tournamentName=${encodeURIComponent(tournamentName)}`,
    {
      method: "GET",
      credentials: "include"
    }
  );

  const data = await response.json();

  if (data.success) {
    showBracketModal(data);
  }
}
function cleanHumanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isLettersOnlyName(value) {
  const cleaned = cleanHumanName(value);

  // Allows: "Ahmed", "Ahmed Mohamed"
  // Blocks: "Ahmed1", "Ahmed@", "123", "Ahmed_Mohamed"
  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

  return nameRegex.test(cleaned);
}

async function submitTeam(event) {
  event.preventDefault();

  const submitBtn = document.querySelector("#team-form .submit-btn");
 const teamName = document.getElementById("team-name").value.trim().replace(/\s+/g, " ");
  const playerRows = document.querySelectorAll("#players-container .player-row");

  const players = Array.from(playerRows).map((row, index) => {
    const nameInput = row.querySelector(".player-name");
    const emailInput = row.querySelector(".player-email");

    return {
      role: index === 0 ? "captain" : "player",
      name: nameInput ? nameInput.value.trim() : "",
      email: emailInput ? emailInput.value.trim() : ""
    };
  });

  if (!teamName) {
    alert("Please enter team name.");
    return;
  }

  if (!players[0] || !players[0].name || !players[0].email) {
    alert("Please enter captain name and email.");
    return;
  }

  const emptyPlayer = players.find(player => !player.name);

  if (emptyPlayer) {
    alert("Please fill all player names.");
    return;
  }
  const isFootballTournament =
  String(pendingTournamentName || "").toLowerCase().includes("football") ||
  String(pendingTournamentName || "").toLowerCase().includes("kora");

if (isFootballTournament && players.length < 7) {
  alert("Football tournament requires at least 7 players.");
  return;
}

  const invalidPlayer = players.find(player => {
  return !isLettersOnlyName(player.name);
});

if (invalidPlayer) {
  alert("Player names must contain letters only. No numbers or symbols allowed.");
  return;
}

players.forEach(player => {
  player.name = cleanHumanName(player.name);
});

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering...";
    }

    const response = await fetch("/events/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        tournamentName: pendingTournamentName,
        teamName,
        players
      })
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Registration failed.");
      return;
    }

    closeRegistration();

    const form = document.getElementById("team-form");

    if (form) {
      form.reset();
    }

    await loadAndShowBracket(pendingTournamentName);

  } catch (error) {
    console.error("Registration error:", error);
    alert("Something went wrong. Please try again.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Complete Registration";
    }
  }
}

window.openRegistration = openRegistration;
window.addPlayer = addPlayer;
window.removePlayer = removePlayer;
window.closeRegistration = closeRegistration;
window.closeAuthModal = closeAuthModal;
window.closeBracketModal = closeBracketModal;
window.submitTeam = submitTeam;