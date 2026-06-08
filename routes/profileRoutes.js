const express = require("express");
const router = express.Router();

const User = require("../models/user");
const StudyProfile = require("../models/StudyProfile");
const Event = require("../models/Events");
const EventRegistration = require("../models/eventsReg");
const { requirePageAuth } = require("../middleware/authMiddleware");

const subjectAliases = {
  algo: "Algorithms",
  algorithm: "Algorithms",
  algorithms: "Algorithms",

  ds: "Data Structures",
  datastructure: "Data Structures",
  datastructures: "Data Structures",
  "data structure": "Data Structures",
  "data structures": "Data Structures",

  os: "Operating Systems",
  "operating system": "Operating Systems",
  "operating systems": "Operating Systems",

  db: "Database",
  database: "Database",
  databases: "Database",

  oop: "Object Oriented Programming",
  "object oriented programming": "Object Oriented Programming",
  "object-oriented programming": "Object Oriented Programming",

  math: "Math",
  maths: "Math",
  mathematics: "Math",

  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",

  ml: "Machine Learning",
  "machine learning": "Machine Learning",

  web: "Web Development",
  "web development": "Web Development",

  se: "Software Engineering",
  "software engineering": "Software Engineering"
};

const normalizeSubject = (subject) => {
  const cleaned = String(subject || "")
    .trim()
    .replace(/\s+/g, " ");

  const key = cleaned.toLowerCase();

  if (subjectAliases[key]) {
    return subjectAliases[key];
  }

  return cleaned
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const cleanSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return [...new Set(
    subjects
      .map(normalizeSubject)
      .filter(subject => subject && subject !== "None")
  )];
};


router.get("/profile", requirePageAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const freshUser = await User.findById(userId).lean();

    const studyProfile = await StudyProfile.findOne({
      user: userId
    }).lean();

    const competitionRegistrations = await EventRegistration.find({
      user: userId
    })
      .sort({ createdAt: -1 })
      .lean();

    res.render("profile", {
      user: freshUser || req.session.user,
      studyProfile,
      competitionRegistrations
    });

  } catch (error) {
    console.error("Profile page error:", error);

    res.render("profile", {
      user: req.session.user,
      studyProfile: null,
      competitionRegistrations: []
    });
  }
});

router.post("/profile/update-info", requirePageAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    let {
      fullName,
      username,
      gender,
      university,
      major
    } = req.body;

    const cleanedFullName = String(fullName || "").trim();
    const cleanedUsername = String(username || "").trim();
    const cleanedGenderRaw = String(gender || "").trim().toLowerCase();
    const cleanedUniversity = String(university || "").trim();
    const cleanedMajor = String(major || "").trim();

    let finalGender = "";

    if (cleanedGenderRaw === "male") {
      finalGender = "Male";
    } else if (cleanedGenderRaw === "female") {
      finalGender = "Female";
    }

    if (
      !cleanedFullName ||
      !cleanedUsername ||
      !finalGender ||
      !cleanedUniversity ||
      !cleanedMajor
    ) {
      req.flash("error", "Please fill in all profile fields.");
      return res.redirect("/profile#info");
    }

    if (cleanedFullName.length < 3 || cleanedFullName.length > 60) {
      req.flash("error", "Full name must be between 3 and 60 characters.");
      return res.redirect("/profile#info");
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(cleanedUsername)) {
      req.flash(
        "error",
        "Username must be 3-20 characters and only contain letters, numbers, and underscores."
      );
      return res.redirect("/profile#info");
    }

    if (cleanedUniversity.length < 2 || cleanedUniversity.length > 80) {
      req.flash("error", "Please enter a valid university.");
      return res.redirect("/profile#info");
    }

    if (cleanedMajor.length < 2 || cleanedMajor.length > 80) {
      req.flash("error", "Please enter a valid major.");
      return res.redirect("/profile#info");
    }

    const existingUsername = await User.findOne({
      username: cleanedUsername,
      _id: {
        $ne: userId
      }
    });

    if (existingUsername) {
      req.flash("error", "Username is already taken.");
      return res.redirect("/profile#info");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullName: cleanedFullName,
        username: cleanedUsername,
        gender: finalGender,
        university: cleanedUniversity,
        major: cleanedMajor
      },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updatedUser) {
      req.flash("error", "User was not found.");
      return res.redirect("/profile#info");
    }

    req.session.user = {
      ...req.session.user,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      gender: updatedUser.gender,
      university: updatedUser.university,
      major: updatedUser.major,
      avatar: updatedUser.avatar || req.session.user.avatar || "",
      role: req.session.user.role || "student"
    };

    await StudyProfile.findOneAndUpdate(
      {
        user: userId
      },
      {
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        university: updatedUser.university || "",
        major: updatedUser.major || ""
      },
      {
        new: true
      }
    );

    req.flash("success", "Profile information updated.");
    res.redirect("/profile#info");

  } catch (error) {
    console.error("Update profile info error:", error);
    req.flash("error", "Could not update profile information.");
    res.redirect("/profile#info");
  }
});

router.post("/profile/update-study-list", requirePageAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const weakInput = Array.isArray(req.body.weakSubjects)
      ? req.body.weakSubjects
      : req.body.weakSubjects
        ? [req.body.weakSubjects]
        : [];

    const strongInput = Array.isArray(req.body.strongSubjects)
      ? req.body.strongSubjects
      : req.body.strongSubjects
        ? [req.body.strongSubjects]
        : [];

    const weakSubjects = cleanSubjects(weakInput);
    const strongSubjects = cleanSubjects(strongInput);

    if (weakSubjects.length > 20 || strongSubjects.length > 20) {
      req.flash("error", "You can add maximum 20 weak subjects and 20 strong subjects.");
      return res.redirect("/profile#study");
    }

    const tooLongSubject = [...weakSubjects, ...strongSubjects].find(subject => {
      return subject.length > 40;
    });

    if (tooLongSubject) {
      req.flash("error", "Each subject must be 40 characters or less.");
      return res.redirect("/profile#study");
    }

    const duplicateSubject = weakSubjects.find(subject => {
      return strongSubjects.includes(subject);
    });

    if (duplicateSubject) {
      req.flash("error", "The same subject cannot be both weak and strong.");
      return res.redirect("/profile#study");
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      req.flash("error", "User was not found.");
      return res.redirect("/profile#study");
    }

    await StudyProfile.findOneAndUpdate(
      {
        user: userId
      },
      {
        user: userId,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        university: user.university || "",
        major: user.major || "",
        weakSubjects,
        strongSubjects
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    req.flash("success", "Study list updated.");
    res.redirect("/profile#study");

  } catch (error) {
    console.error("Update study list error:", error);
    req.flash("error", "Could not update study list.");
    res.redirect("/profile#study");
  }
});

router.post("/profile/competition/:registrationId/update", requirePageAuth, async (req, res) => {
  try {
    const { registrationId } = req.params;

    const {
      captainName,
      captainEmail,
      teamName,
      playersText
    } = req.body;

    const cleanedCaptainName = String(captainName || "").trim();
    const cleanedCaptainEmail = String(captainEmail || "").trim().toLowerCase();
    const cleanedTeamName = String(teamName || "").trim();

    if (!cleanedCaptainName || !cleanedCaptainEmail || !cleanedTeamName) {
      req.flash("error", "Captain name, captain email, and team name are required.");
      return res.redirect("/profile");
    }

    const players = String(playersText || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map((name, index) => {
        return {
          role: index === 0 ? "captain" : "player",
          name,
          email: index === 0 ? cleanedCaptainEmail : ""
        };
      });

    if (players.length === 0) {
      players.push({
        role: "captain",
        name: cleanedCaptainName,
        email: cleanedCaptainEmail
      });
    }

    const updatedRegistration = await EventRegistration.findOneAndUpdate(
      {
        _id: registrationId,
        user: req.session.user.id
      },
      {
        captainName: cleanedCaptainName,
        captainEmail: cleanedCaptainEmail,
        teamName: cleanedTeamName,
        players
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedRegistration) {
      req.flash("error", "Competition registration was not found.");
      return res.redirect("/profile");
    }

    req.flash("success", "Competition updated.");
    res.redirect("/profile");

  } catch (error) {
    console.error("Update competition error:", error);
    req.flash("error", "Could not update competition.");
    res.redirect("/profile");
  }
});


router.post("/profile/competition/:registrationId/forfeit", requirePageAuth, async (req, res) => {
  try {
    const { registrationId } = req.params;

    const deletedRegistration = await EventRegistration.findOneAndDelete({
      _id: registrationId,
      user: req.session.user.id
    });

    if (!deletedRegistration) {
      req.flash("error", "Competition registration was not found.");
      return res.redirect("/profile");
    }

    const relatedEvent = await Event.findOne({
      title: deletedRegistration.tournamentName
    });

    if (relatedEvent && relatedEvent.bracket) {
      const removedId = String(registrationId);

      relatedEvent.bracket.roundOf8 = (relatedEvent.bracket.roundOf8 || []).map(slot => {
        if (String(slot.registrationId || "") === removedId) {
          return {
            slot: slot.slot,
            registrationId: null,
            teamName: ""
          };
        }

        return slot;
      });

      relatedEvent.bracket.semiFinal = (relatedEvent.bracket.semiFinal || []).map(slot => {
        if (String(slot.registrationId || "") === removedId) {
          return {
            slot: slot.slot,
            registrationId: null,
            teamName: ""
          };
        }

        return slot;
      });

      relatedEvent.bracket.final = (relatedEvent.bracket.final || []).map(slot => {
        if (String(slot.registrationId || "") === removedId) {
          return {
            slot: slot.slot,
            registrationId: null,
            teamName: ""
          };
        }

        return slot;
      });

      if (
        relatedEvent.bracket.winner &&
        String(relatedEvent.bracket.winner.registrationId || "") === removedId
      ) {
        relatedEvent.bracket.winner = {
          registrationId: null,
          teamName: ""
        };
      }

      await relatedEvent.save();
    }

    req.flash("success", "You have been removed from the competition.");
    res.redirect("/profile");

  } catch (error) {
    console.error("Forfeit competition error:", error);
    req.flash("error", "Could not forfeit competition.");
    res.redirect("/profile");
  }
});



module.exports = router;
