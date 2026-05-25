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

  pendingTournamentName = name;

  if (!isLoggedIn) {
    document.getElementById("auth-modal").classList.remove("hidden");
    return;
  }

  maxP = Number(maxPlayersFromDatabase) || 10;

  document.getElementById("modal-tournament-name").innerText = name;

  document.getElementById("players-container").innerHTML = `
    <div class="form-group">
      <label>Player 1 (Captain) *</label>
      <div class="player-inputs">
        <input type="text" placeholder="Full Name" required>
        <input type="email" placeholder="Email Address" required>
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
  const num = container.children.length + 1;

  if (num > maxP) return;

  container.insertAdjacentHTML("beforeend", `
    <div class="form-group">
      <label>Player ${num}</label>
      <div class="player-inputs">
        <input type="text" placeholder="Full Name" required>
        <input type="email" placeholder="Email Address" required>
      </div>
    </div>
  `);

  if (num === maxP) {
    document.querySelector(".add-player-btn").style.display = "none";
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

  const teamName = document.getElementById("team-name").value.trim();
  const playerRows = document.querySelectorAll("#players-container .player-inputs");

  const players = Array.from(playerRows).map(row => {
    const inputs = row.querySelectorAll("input");

    return {
      name: inputs[0].value.trim(),
      email: inputs[1].value.trim()
    };
  });

  try {
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
  }
}

window.openRegistration = openRegistration;
window.addPlayer = addPlayer;
window.closeRegistration = closeRegistration;
window.closeAuthModal = closeAuthModal;
window.submitTeam = submitTeam;