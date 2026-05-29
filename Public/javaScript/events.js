document.addEventListener("DOMContentLoaded", function () {
  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal-item").forEach(el => observer.observe(el));
});

let maxP = 10;
let pendingTournamentName = "";

const isLoggedIn =
  window.EVENTS_PAGE_DATA && window.EVENTS_PAGE_DATA.isLoggedIn === true;

function openRegistration(e, name, maxPlayersFromDatabase) {
  e.preventDefault();

  if (!window.EVENTS_PAGE_DATA || !window.EVENTS_PAGE_DATA.isLoggedIn) {
    window.location.href = "/login?returnTo=/events";
    return;
  }

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

    if (index === 0) {
      label.innerText = "Captain *";
    } else {
      label.innerText = `Player ${index + 1}`;
    }
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

async function submitTeam(event) {
  event.preventDefault();

  const submitBtn = document.querySelector(".submit-btn");
  const teamName = document.getElementById("team-name").value.trim();
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

    alert(data.message);

    closeRegistration();
    document.getElementById("team-form").reset();

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
window.submitTeam = submitTeam;