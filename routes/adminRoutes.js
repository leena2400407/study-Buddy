const express = require("express");
const router = express.Router();

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const StudyProfile = require("../models/StudyProfile");
const GameScore = require("../models/gamescore");
const Event = require("../models/Events");
const EventRegistration = require("../models/eventsReg");
const University = require("../models/Universities");
const ResourceCategory = require("../models/resources");
const Avatar = require("../models/Avatar");

const avatarUploadDir = path.join(__dirname, "..", "Public", "uploads", "avatars");

if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarUploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }

    cb(null, true);
  }
});

const requireAdminPage = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login?returnTo=/admin");
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).render("UNAUTHORIZED");
  }

  next();
};



const requireAdminApi = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first."
    });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only."
    });
  }

  next();
};

router.get("/admin/api/overview", requireAdminApi, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const studyProfilesCount = await StudyProfile.countDocuments();
    const eventRegistrationsCount = await EventRegistration.countDocuments();
    const gameScoresCount = await GameScore.countDocuments();
    const eventsCount = await Event.countDocuments();
    const universitiesCount = await University.countDocuments();
    const resourcesCount = await ResourceCategory.countDocuments();
    const avatarsCount = await Avatar.countDocuments();

    res.json({
      success: true,
      overview: {
        usersCount,
        studyProfilesCount,
        eventRegistrationsCount,
        gameScoresCount,
        eventsCount,
        universitiesCount,
        resourcesCount,
        avatarsCount
      }
    });
  } catch (error) {
    console.error("Admin overview error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load admin overview."
    });
  }
});

router.get("/api/avatars", async (req, res) => {
  try {
    const avatars = await Avatar.find()
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      avatars
    });

  } catch (error) {
    console.error("Load avatars error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load avatars."
    });
  }
});

router.get("/admin/api/avatars", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await Avatar.countDocuments();

    const avatars = await Avatar.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      avatars,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

  } catch (error) {
    console.error("Admin avatars error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load avatars."
    });
  }
});

router.post("/admin/api/avatars", requireAdminApi, avatarUpload.single("avatarImage"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Avatar name is required."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required."
      });
    }

    const imagePath = `/uploads/avatars/${req.file.filename}`;

    const avatar = await Avatar.create({
      name,
      imagePath
    });

    return res.json({
      success: true,
      message: "Avatar uploaded successfully.",
      avatar
    });

  } catch (error) {
    console.error("Upload avatar error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Could not upload avatar."
    });
  }
});

router.delete("/admin/api/avatars/:avatarId", requireAdminApi, async (req, res) => {
  try {
    const { avatarId } = req.params;

    const avatar = await Avatar.findByIdAndDelete(avatarId);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: "Avatar was not found."
      });
    }

    const filePath = path.join(__dirname, "..", "Public", avatar.imagePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({
      success: true,
      message: "Avatar deleted successfully."
    });

  } catch (error) {
    console.error("Delete avatar error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete avatar."
    });
  }
});

function getPagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 100, 1),
    100
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip
  };
}

function parseResourcesText(value) {
  return String(value || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|").map(part => part.trim());

      return {
        title: parts[0] || "",
        url: parts[1] || "",
        type: parts[2] || "website"
      };
    })
    .filter(resource => resource.title && resource.url);
}

router.get("/admin/api/resources", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await ResourceCategory.countDocuments();

    const categories = await ResourceCategory.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      categories,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

  } catch (error) {
    console.error("Admin resources error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load resources."
    });
  }
});

router.post("/admin/api/resources", requireAdminApi, async (req, res) => {
  try {
    const {
      name,
      shortName,
      color,
      resourcesText
    } = req.body;

    if (!name || !shortName) {
      return res.status(400).json({
        success: false,
        message: "Category name and short name are required."
      });
    }

    const category = await ResourceCategory.create({
      name: name.trim(),
      shortName: shortName.trim(),
      color: color || "#0077b6",
      resources: parseResourcesText(resourcesText)
    });

    res.json({
      success: true,
      message: "Resource category added successfully.",
      category
    });

  } catch (error) {
    console.error("Admin add resource category error:", error);

    res.status(500).json({
      success: false,
      message: "Could not add resource category."
    });
  }
});

router.patch("/admin/api/resources/:categoryId", requireAdminApi, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const {
      name,
      shortName,
      color,
      resourcesText
    } = req.body;

    const category = await ResourceCategory.findByIdAndUpdate(
      categoryId,
      {
        name: name.trim(),
        shortName: shortName.trim(),
        color: color || "#0077b6",
        resources: parseResourcesText(resourcesText)
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Resource category was not found."
      });
    }

    res.json({
      success: true,
      message: "Resource category updated successfully.",
      category
    });

  } catch (error) {
    console.error("Admin update resource category error:", error);

    res.status(500).json({
      success: false,
      message: "Could not update resource category."
    });
  }
});

router.delete("/admin/api/resources/:categoryId", requireAdminApi, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await ResourceCategory.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Resource category was not found."
      });
    }

    res.json({
      success: true,
      message: "Resource category deleted successfully."
    });

  } catch (error) {
    console.error("Admin delete resource category error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete resource category."
    });
  }
});

router.patch("/admin/api/users/:userId", requireAdminApi, async (req, res) => {
  try {
    const { userId } = req.params;

    let {
      fullName,
      username,
      email,
      password,
      gender,
      university,
      major,
      role
    } = req.body;

    fullName = String(fullName || "").trim().replace(/\s+/g, " ");
    username = String(username || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    university = String(university || "").trim();
    major = String(major || "").trim();
    role = String(role || "student").trim().toLowerCase();

    const cleanedGender = String(gender || "").trim().toLowerCase();

    if (!fullName || !username || !email || !cleanedGender || !university || !major || !role) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all user fields except password."
      });
    }

    let finalGender = "";

    if (cleanedGender === "male") {
      finalGender = "Male";
    } else if (cleanedGender === "female") {
      finalGender = "Female";
    } else {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male or Female."
      });
    }

    if (!["student", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be student or admin."
      });
    }

    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or username already exists."
      });
    }

    const updateData = {
      fullName,
      username,
      email,
      gender: finalGender,
      university,
      major,
      role
    };

    if (password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User was not found."
      });
    }

    await StudyProfile.findOneAndUpdate(
      { user: userId },
      {
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
        university: updatedUser.university || "",
        major: updatedUser.major || ""
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "User updated successfully.",
      user: updatedUser
    });

  } catch (error) {
    console.error("Admin update user error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Could not update user."
    });
  }
});

router.get("/admin/api/users", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await User.countDocuments();

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load users."
    });
  }
});

router.post("/admin/api/users", requireAdminApi, async (req, res) => {
  try {
    let {
      fullName,
      username,
      email,
      password,
      gender,
      university,
      major,
      role
    } = req.body;

    fullName = String(fullName || "").trim();
    username = String(username || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    university = String(university || "").trim();
    major = String(major || "").trim();
    role = String(role || "student").trim().toLowerCase();

    const cleanedGender = String(gender || "").trim().toLowerCase();
    fullName = fullName.replace(/\s+/g, " ");
    const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;

    if (!fullNameRegex.test(fullName)) {
       return res.status(400).json({
        success: false,
        message: "Full name must start with letters, and numbers are only allowed at the end."
      });
    }

    const usernameRegex = /^(?=.{3,20}$)[A-Za-z_]+[0-9]*$/;
    if (!usernameRegex.test(username)) {
       return res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters, start with letters/underscores, and numbers are only allowed at the end."
      });
    }

    if (!fullName || !username || !email || !password || !cleanedGender || !university || !major || !role) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all user fields."
      });
    }

    let finalGender = "";

    if (cleanedGender === "male") {
      finalGender = "Male";
    } else if (cleanedGender === "female") {
      finalGender = "Female";
    } else {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male or Female."
      });
    }

    if (!["student", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be student or admin."
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email."
      });
    }

    const passwordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
      success: false,
      message:
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    });
  }

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or username already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
      gender: finalGender,
      university,
      major,
      role
    });

    return res.json({
      success: true,
      message: `${role === "admin" ? "Admin" : "User"} created successfully.`,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
        university: newUser.university,
        major: newUser.major,
        gender: newUser.gender,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error("Admin create user error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Could not create user."
    });
  }
});

router.get("/admin/api/study-profiles", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await StudyProfile.countDocuments();

    const profiles = await StudyProfile.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      profiles,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin study profiles error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load study profiles."
    });
  }
});

router.get("/admin/api/event-registrations", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await EventRegistration.countDocuments();

    const registrations = await EventRegistration.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      registrations,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin event registrations error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load event registrations."
    });
  }
});

router.get("/admin/api/events/:eventId/bracket", requireAdminApi, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    const registrations = await EventRegistration.find({
      tournamentName: event.title
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    return res.json({
      success: true,
      event,
      registrations,
      bracket: event.bracket || {
        roundOf8: [],
        semiFinal: [],
        final: [],
        winner: {
          teamName: "",
          registrationId: null
        }
      }
    });

  } catch (error) {
    console.error("Admin load event bracket error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load event bracket."
    });
  }
});

router.get("/admin/api/game-scores", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await GameScore.countDocuments();

    const scores = await GameScore.find()
      .sort({ score: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      scores,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin game scores error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load game scores."
    });
  }
});

router.patch("/admin/api/events/:eventId/bracket", requireAdminApi, async (req, res) => {
  try {
    const { eventId } = req.params;

    const {
      roundOf8,
      semiFinal,
      final,
      winner
    } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    event.bracket = {
      roundOf8: await buildBracketRound(roundOf8),
      semiFinal: await buildBracketRound(semiFinal),
      final: await buildBracketRound(final),
      winner: {
        teamName: String(winner?.teamName || "").trim(),
        registrationId: String(winner?.registrationId || "").trim() || null
      }
    };

    await event.save();

    return res.json({
      success: true,
      message: "Bracket saved successfully.",
      bracket: event.bracket
    });

  } catch (error) {
    console.error("Admin save event bracket error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not save bracket."
    });
  }
});

async function buildBracketRound(roundData = []) {
  if (!Array.isArray(roundData)) return [];

  const finalRound = [];

  for (let i = 0; i < roundData.length; i++) {
    const item = roundData[i];

    const registrationId = String(item.registrationId || "").trim();
    const teamName = String(item.teamName || "").trim();

    finalRound.push({
      slot: Number(item.slot) || i + 1,
      registrationId: registrationId || null,
      teamName
    });
  }

  return finalRound;
}

router.get("/admin/api/events", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await Event.countDocuments();

    const events = await Event.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin events error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load events."
    });
  }
});

router.get("/admin/api/universities", requireAdminApi, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const totalItems = await University.countDocuments();

    const universities = await University.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      universities,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    console.error("Admin universities error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load universities."
    });
  }
});

router.post("/admin/api/events", requireAdminApi, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      imagePath,
      buttonType,
      detailsLink,
      maxPlayers
    } = req.body;

    if (!title || !category || !description || !imagePath || !buttonType) {
      return res.status(400).json({
        success: false,
        message: "Title, category, description, image, and button type are required."
      });
    }

    const event = await Event.create({
      title,
      category,
      description,
      imagePath,
      buttonType,
      detailsLink: detailsLink || "",
      maxPlayers: Number(maxPlayers) || 0
    });

    res.json({
      success: true,
      message: "Event added successfully.",
      event
    });

  } catch (error) {
    console.error("Admin add event error:", error);

    res.status(500).json({
      success: false,
      message: "Could not add event."
    });
  }
});

router.patch("/admin/api/events/:eventId", requireAdminApi, async (req, res) => {
  try {
    const { eventId } = req.params;

    const {
      title,
      category,
      description,
      imagePath,
      buttonType,
      detailsLink,
      maxPlayers
    } = req.body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        title,
        category,
        description,
        imagePath,
        buttonType,
        detailsLink: detailsLink || "",
        maxPlayers: Number(maxPlayers) || 0
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    res.json({
      success: true,
      message: "Event updated successfully.",
      event
    });

  } catch (error) {
    console.error("Admin update event error:", error);

    res.status(500).json({
      success: false,
      message: "Could not update event."
    });
  }
});

router.delete("/admin/api/events/:eventId", requireAdminApi, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    await EventRegistration.deleteMany({
      tournamentName: event.title
    });

    res.json({
      success: true,
      message: "Event and related registrations deleted successfully."
    });

  } catch (error) {
    console.error("Admin delete event error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete event."
    });
  }
});

router.delete("/admin/api/event-registrations/:registrationId", requireAdminApi, async (req, res) => {
  try {
    const { registrationId } = req.params;

    const deletedRegistration = await EventRegistration.findByIdAndDelete(registrationId);

    if (!deletedRegistration) {
      return res.status(404).json({
        success: false,
        message: "Registration was not found."
      });
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

    return res.json({
      success: true,
      message: "Team removed successfully and cleared from bracket."
    });

  } catch (error) {
    console.error("Admin delete event registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not remove team."
    });
  }
});

router.patch("/admin/api/events/:eventId/bracket/reset", requireAdminApi, async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    event.bracket = {
      roundOf8: [],
      semiFinal: [],
      final: [],
      winner: {
        teamName: "",
        registrationId: null
      }
    };

    await event.save();

    return res.json({
      success: true,
      message: "Bracket reset successfully."
    });

  } catch (error) {
    console.error("Admin reset bracket error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not reset bracket."
    });
  }
});

function splitLines(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);
}

router.post("/admin/api/universities", requireAdminApi, async (req, res) => {
  try {
    const {
      name,
      shortName,
      imagePath,
      overview,
      location,
      academics,
      whyChoose,
      studentLife,
      contactInfo,
      portalLink
    } = req.body;

    if (!name || !shortName || !imagePath || !overview || !location || !portalLink) {
      return res.status(400).json({
        success: false,
        message: "Name, short name, image, overview, location, and portal link are required."
      });
    }

    const university = await University.create({
      name,
      shortName,
      imagePath,
      overview,
      location,
      academics: splitLines(academics),
      whyChoose: splitLines(whyChoose),
      studentLife: splitLines(studentLife),
      contactInfo: contactInfo || "",
      portalLink
    });

    res.json({
      success: true,
      message: "University added successfully.",
      university
    });

  } catch (error) {
    console.error("Admin add university error:", error);

    res.status(500).json({
  success: false,
  message: error.message
});
  }
});

router.patch("/admin/api/universities/:universityId", requireAdminApi, async (req, res) => {
  try {
    const { universityId } = req.params;

    const {
      name,
      shortName,
      imagePath,
      overview,
      location,
      academics,
      whyChoose,
      studentLife,
      contactInfo,
      portalLink
    } = req.body;

    const university = await University.findByIdAndUpdate(
      universityId,
      {
        name,
        shortName,
        imagePath,
        overview,
        location,
        academics: splitLines(academics),
        whyChoose: splitLines(whyChoose),
        studentLife: splitLines(studentLife),
        contactInfo: contactInfo || "",
        portalLink
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!university) {
      return res.status(404).json({
        success: false,
        message: "University was not found."
      });
    }

    res.json({
      success: true,
      message: "University updated successfully.",
      university
    });

  } catch (error) {
    console.error("Admin update university error:", error);

    res.status(500).json({
      success: false,
      message: "Could not update university."
    });
  }
});

router.delete("/admin/api/universities/:universityId", requireAdminApi, async (req, res) => {
  try {
    const { universityId } = req.params;

    const university = await University.findByIdAndDelete(universityId);

    if (!university) {
      return res.status(404).json({
        success: false,
        message: "University was not found."
      });
    }

    res.json({
      success: true,
      message: "University deleted successfully."
    });

  } catch (error) {
    console.error("Admin delete university error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete university."
    });
  }
});



router.delete("/admin/users/:userId", requireAdminApi, async (req, res) => {  try {
    const { userId } = req.params;

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User was not found."
      });
    }

    await StudyProfile.deleteMany({
      user: userId
    });

    await GameScore.deleteMany({
      user: userId
    });

    await EventRegistration.deleteMany({
      user: userId
    });

    res.json({
      success: true,
      message: "User and related records deleted successfully."
    });

  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete user."
    });
  }
});



module.exports = router;
