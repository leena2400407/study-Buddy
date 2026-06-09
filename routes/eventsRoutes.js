const express = require("express");
const router = express.Router();

const Event = require("../models/Events");
const EventRegistration = require("../models/eventsReg");
const sendEmail = require("../utils/sendEmail");
const { requireAuth } = require("../middleware/authMiddleware");

const sendEventRegistrationEmail = async ({
  to,
  leaderName,
  tournamentName,
  teamName,
  players,
  eventDescription,
  eventCategory,
  eventDetailsLink
}) => {
  const locationLink =
    eventDetailsLink && String(eventDetailsLink).trim()
      ? String(eventDetailsLink).trim()
      : "Location link was not added yet.";

  const safeDescription =
    eventDescription && String(eventDescription).trim()
      ? String(eventDescription).trim()
      : "No event description was added.";

  const cleanedCategory = String(eventCategory || "").toLowerCase();
  const cleanedTitle = String(tournamentName || "").toLowerCase();

  const eventType =
    cleanedCategory.includes("padel") || cleanedTitle.includes("padel")
      ? "Padel Tournament"
      : cleanedCategory.includes("football") ||
        cleanedCategory.includes("sports") ||
        cleanedTitle.includes("football")
        ? "Football Tournament"
        : "Sports Tournament";

  const playersList = players
    .map((player, index) => {
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${player.name}</td>
        </tr>
      `;
    })
    .join("");

  await sendEmail({
    to,
    subject: `${eventType} Registration Confirmation`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>${eventType} Registration Confirmed</h2>

        <p>Hello ${leaderName},</p>
        <p>Your team has been registered successfully.</p>
        <p>Please note that  a down payment of 50% of the registration fee the must be paid within three 
        days from the date of receiving this approval email. Failure 
        to complete the payment within this period may result in 
        cancellation of your registration.</p>
        <p>Payment Method: Instapay 01111506687 (name: Mohamed Walid)</p>
        <p>After Payment screenshot your transaction and forword it to us.</p>

        <p><strong>Tournament:</strong> ${tournamentName}</p>
        <p><strong>Team Name:</strong> ${teamName}</p>

        <h3>Event Description</h3>
        <p>${safeDescription}</p>

        <h3>Location / Details Link</h3>
        <p>
          ${
            locationLink.startsWith("http")
              ? `<a href="${locationLink}" target="_blank">${locationLink}</a>`
              : locationLink
          }
        </p>

        <h3>Players</h3>
        <table style="border-collapse: collapse; width: 100%; border: 1px solid #e5e7eb;">
          <thead>
            <tr>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">#</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">Name</th>
            </tr>
          </thead>
          <tbody>
            ${playersList}
          </tbody>
        </table>

        <br>
        <p>Best regards,</p>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `,
    text: `Your ${eventType} registration is confirmed. Tournament: ${tournamentName}. Team: ${teamName}.`
  });
};


router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: 1 });

    const sportsCategories = ["sports", "football", "padel"];
    const entertainmentCategories = ["music", "concert", "entertainment"];

    const sportsEvents = events.filter(event =>
      sportsCategories.includes(String(event.category).toLowerCase())
    );

    const entertainmentEvents = events.filter(event =>
      entertainmentCategories.includes(String(event.category).toLowerCase())
    );

    res.render("events", {
      isLoggedIn: !!req.session.user,
      sportsEvents,
      entertainmentEvents
    });

  } catch (error) {
    console.error("Events page error:", error);

    res.render("events", {
      isLoggedIn: !!req.session.user,
      sportsEvents: [],
      entertainmentEvents: []
    });
  }
});


router.get("/api/events/registration-status", requireAuth, async (req, res) => {
  try {
    const tournamentName = String(req.query.tournamentName || "").trim();

    if (!tournamentName) {
      return res.status(400).json({
        success: false,
        message: "Tournament name is required."
      });
    }

    const eventData = await Event.findOne({
      title: tournamentName
    }).lean();

    if (!eventData) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    const registration = await EventRegistration.findOne({
      user: req.session.user.id,
      tournamentName
    }).lean();

    if (!registration) {
      return res.json({
        success: true,
        registered: false
      });
    }

    return res.json({
      success: true,
      registered: true,
      event: {
        title: eventData.title,
        category: eventData.category,
        description: eventData.description,
        imagePath: eventData.imagePath,
        detailsLink: eventData.detailsLink,
        maxPlayers: eventData.maxPlayers
      },
      registration: {
        teamName: registration.teamName,
        captainName: registration.captainName,
        captainEmail: registration.captainEmail,
        players: registration.players || [],
        createdAt: registration.createdAt
      }
    });

  } catch (error) {
    console.error("Registration status error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not check registration status."
    });
  }
});

router.get("/api/events/bracket", requireAuth, async (req, res) => {
  try {
    const tournamentName = String(req.query.tournamentName || "").trim();

    if (!tournamentName) {
      return res.status(400).json({
        success: false,
        message: "Tournament name is required."
      });
    }

    const eventData = await Event.findOne({
      title: tournamentName
    }).lean();

    if (!eventData) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    const registrations = await EventRegistration.find({
      tournamentName
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(8)
      .lean();

    const validRegistrationIds = new Set(
      registrations.map(registration => String(registration._id))
    );

    const myRegistrationData = await EventRegistration.findOne({
      user: req.session.user.id,
      tournamentName
    }).lean();

    const originalBracket = eventData.bracket || {
      roundOf8: [],
      semiFinal: [],
      final: [],
      winner: {
        teamName: "",
        registrationId: null
      }
    };

    function cleanSavedRound(roundData = [], count) {
      const finalRound = [];

      for (let i = 0; i < count; i++) {
        const slot =
          Array.isArray(roundData)
            ? roundData.find(item => Number(item.slot) === i + 1) || roundData[i] || {}
            : {};

        const registrationId = String(slot.registrationId || "");

        if (registrationId && validRegistrationIds.has(registrationId)) {
          finalRound.push({
            slot: i + 1,
            registrationId,
            teamName: slot.teamName || ""
          });
        } else {
          finalRound.push({
            slot: i + 1,
            registrationId: null,
            teamName: ""
          });
        }
      }

      return finalRound;
    }

    const cleanedBracket = {
      roundOf8: cleanSavedRound(originalBracket.roundOf8 || [], 8),
      semiFinal: cleanSavedRound(originalBracket.semiFinal || [], 4),
      final: cleanSavedRound(originalBracket.final || [], 2),
      winner: {
        registrationId: null,
        teamName: ""
      }
    };

    const winnerId = String(originalBracket.winner?.registrationId || "");

    if (winnerId && validRegistrationIds.has(winnerId)) {
      cleanedBracket.winner = {
        registrationId: winnerId,
        teamName: originalBracket.winner?.teamName || ""
      };
    }

    const hasCleanSavedRoundOf8 = cleanedBracket.roundOf8.some(slot => {
      return slot.registrationId && slot.teamName;
    });

    let teams = [];

    if (hasCleanSavedRoundOf8) {
      teams = cleanedBracket.roundOf8.map((slot, index) => {
        return {
          seed: index + 1,
          teamName: slot.teamName || "Empty Slot",
          captainName: "",
          captainEmail: "",
          players: [],
          isMine: String(slot.registrationId || "") === String(myRegistrationData?._id || "")
        };
      });
    } else {
      teams = registrations.map((registration, index) => {
        return {
          seed: index + 1,
          teamName: registration.teamName,
          captainName: registration.captainName,
          captainEmail: registration.captainEmail,
          players: registration.players || [],
          isMine: String(registration.user) === String(req.session.user.id)
        };
      });
    }

    const myRegistration = myRegistrationData
      ? {
          teamName: myRegistrationData.teamName,
          captainName: myRegistrationData.captainName,
          captainEmail: myRegistrationData.captainEmail,
          players: myRegistrationData.players || [],
          createdAt: myRegistrationData.createdAt
        }
      : null;

    return res.json({
      success: true,
      registered: !!myRegistrationData,
      event: {
        title: eventData.title,
        category: eventData.category,
        description: eventData.description,
        imagePath: eventData.imagePath,
        detailsLink: eventData.detailsLink,
        maxPlayers: eventData.maxPlayers
      },
      myRegistration,
      teams,
      bracket: cleanedBracket
    });

  } catch (error) {
    console.error("Bracket load error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load tournament bracket."
    });
  }
});

function cleanHumanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isLettersOnlyName(value) {
  const cleaned = cleanHumanName(value);

  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

  return nameRegex.test(cleaned);
}

function cleanTeamName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

router.post("/events/register", requireAuth, async (req, res) => {
  try {
    const { tournamentName, players } = req.body;
    const teamName = cleanTeamName(req.body.teamName);

    if (!tournamentName || !teamName || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please fill in team name and captain details."
      });
    }

    const eventData = await Event.findOne({ title: tournamentName });

    if (!eventData) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    const alreadyRegistered = await EventRegistration.findOne({
      user: req.session.user.id,
      tournamentName
    }).lean();
    if (alreadyRegistered) {
      return res.json({
      success: true,
      alreadyRegistered: true,
       message: "You are already registered for this tournament.",
       event: {
        title: eventData.title,
        category: eventData.category,
        description: eventData.description,
        imagePath: eventData.imagePath,
        detailsLink: eventData.detailsLink,
        maxPlayers: eventData.maxPlayers
      
      },
    registration: {
      teamName: alreadyRegistered.teamName,
      captainName: alreadyRegistered.captainName,
      captainEmail: alreadyRegistered.captainEmail,
      players: alreadyRegistered.players || [],
      createdAt: alreadyRegistered.createdAt
    }
  });
}
const duplicateTeam = await EventRegistration.findOne({
  tournamentName,
  teamName
})
  .collation({ locale: "en", strength: 2 })
  .lean();

if (duplicateTeam) {
  return res.status(400).json({
    success: false,
    message: "This team name is already registered in this tournament. Please choose another team name."
  });
}



    const maxPlayers = Number(eventData.maxPlayers) || 10;

   const eventCategoryText = String(eventData.category || "").toLowerCase();
   const eventTitleText = String(eventData.title || "").toLowerCase();

const isPadelTournament =
  eventCategoryText.includes("padel") || eventTitleText.includes("padel");

if (isPadelTournament && players.length !== 2) {
  return res.status(400).json({
    success: false,
    message: "Padel registration must have exactly 2 players. Not 1 and not more than 2."
  });
}

if (!isPadelTournament && players.length > maxPlayers) {
  return res.status(400).json({
    success: false,
    message: `This tournament allows maximum ${maxPlayers} players.`
  });
}

    const captain = players[0];

    const captainName = cleanHumanName(captain?.name);
    const captainEmail = String(captain?.email || "").trim().toLowerCase();

    if (!captainName || !captainEmail) {
      return res.status(400).json({
        success: false,
        message: "Captain name and email are required."
      });
    }
    if (!isLettersOnlyName(captainName)) {
  return res.status(400).json({
    success: false,
    message: "Captain name must contain letters only. No numbers or symbols allowed."
  });
  }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(captainEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid captain email."
      });
    }

   const cleanedPlayers = players
  .map((player, index) => {
    const playerName = cleanHumanName(player.name);

    if (!playerName) return null;

    return {
      role: index === 0 ? "captain" : "player",
      name: playerName,
      email: index === 0 ? captainEmail : ""
    };
  })
  .filter(Boolean);
  
  if (isPadelTournament && cleanedPlayers.length !== 2) {
  return res.status(400).json({
    success: false,
    message: "Padel registration must have exactly 2 valid player names."
  });
}

const invalidPlayer = cleanedPlayers.find(player => {
  return !isLettersOnlyName(player.name);
});

if (invalidPlayer) {
  return res.status(400).json({
    success: false,
    message: "Player names must contain letters only. No numbers or symbols allowed."
  });
}

    await EventRegistration.create({
      user: req.session.user.id,
      fullName: req.session.user.fullName || "Unknown User",
      email: req.session.user.email || "unknown@email.com",
      university: req.session.user.university || "Unknown University",
      tournamentName,
      teamName,
      captainName,
      captainEmail,
      players: cleanedPlayers
    });

    try {
      await sendEventRegistrationEmail({
        to: captainEmail,
        leaderName: captainName,
        tournamentName: eventData.title,
        teamName,
        players: cleanedPlayers,
        eventDescription: eventData.description,
        eventCategory: eventData.category,
        eventDetailsLink: eventData.detailsLink
      });
    } catch (emailError) {
      console.error("Event registration email error:", emailError);
    }

    res.json({
    success: true,
    alreadyRegistered: false,
    message: "Tournament registration completed successfully. Confirmation email sent to the captain.",
    event: {
      title: eventData.title,
      category: eventData.category,
      description: eventData.description,
      imagePath: eventData.imagePath,
      detailsLink: eventData.detailsLink,
      maxPlayers: eventData.maxPlayers
    },
    registration: {
      teamName,
      captainName,
      captainEmail,
      players: cleanedPlayers,
      createdAt: new Date()
    } 
  
  });

  } catch (error) {
    console.error("Event registration error:", error);

    res.status(500).json({
      success: false,
      message: "Could not complete registration."
    });
  }
});


module.exports = router;
