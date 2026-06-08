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


   //ADMIN BACKEND VALIDATION HELPERS
  

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidObjectIdString(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ""));
}

function isValidFullName(value) {
  const text = cleanText(value);
  return text.length >= 5 && text.length <= 80 && /^[A-Za-z]+(?: [A-Za-z]+)+$/.test(text);
}

function isValidUsername(value) {
  const text = String(value || "").trim();
  return /^(?=.{3,20}$)[A-Za-z][A-Za-z0-9_]*$/.test(text);
}

function isValidEmail(value) {
  const text = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
}

function isValidStrongPassword(value) {
  const text = String(value || "");
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(text);
}

function isValidSimpleText(value, min = 2, max = 80) {
  const text = cleanText(value);

  return (
    text.length >= min &&
    text.length <= max &&
    /^[A-Za-z0-9][A-Za-z0-9\s&+.#()\-']*$/.test(text)
  );
}

function isValidLongText(value, min = 10, max = 2000) {
  const text = cleanText(value);
  return text.length >= min && text.length <= max;
}

function isSafePathOrUrl(value) {
  const text = String(value || "").trim();

  if (!text) return false;

  const lowerText = text.toLowerCase();

  if (
    lowerText.startsWith("javascript:") ||
    lowerText.startsWith("data:") ||
    lowerText.startsWith("vbscript:") ||
    text.includes("..") ||
    /[<>"']/.test(text)
  ) {
    return false;
  }

  if (text.startsWith("/")) {
    return text.length > 1 && !/\s/.test(text);
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function isValidImagePath(value) {
  const text = String(value || "").trim();
  const lowerText = text.toLowerCase().split("?")[0].split("#")[0];

  if (!isSafePathOrUrl(text)) return false;

  return (
    lowerText.endsWith(".jpg") ||
    lowerText.endsWith(".jpeg") ||
    lowerText.endsWith(".png") ||
    lowerText.endsWith(".webp") ||
    lowerText.includes("unsplash.com") ||
    lowerText.includes("images.")
  );
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value || "").trim());
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return ["student", "admin"].includes(role) ? role : "";
}

function normalizeGender(value) {
  const gender = String(value || "").trim().toLowerCase();

  if (gender === "male") return "Male";
  if (gender === "female") return "Female";

  return "";
}

async function ensureUniqueUser({ userId = null, email, username }) {
  const duplicateUser = await User.findOne({
    $or: [
      { email: String(email || "").trim().toLowerCase() },
      { username: String(username || "").trim() }
    ]
  }).lean();

  if (!duplicateUser) return true;

  if (userId && String(duplicateUser._id) === String(userId)) {
    return true;
  }

  return false;
}

async function ensureUniqueEventTitle({ eventId = null, title }) {
  const duplicateEvent = await Event.findOne({
    title: new RegExp(`^${escapeRegExp(cleanText(title))}$`, "i")
  }).lean();

  if (!duplicateEvent) return true;

  if (eventId && String(duplicateEvent._id) === String(eventId)) {
    return true;
  }

  return false;
}

async function ensureUniqueUniversity({ universityId = null, name, shortName }) {
  const duplicateUniversity = await University.findOne({
    $or: [
      { name: new RegExp(`^${escapeRegExp(cleanText(name))}$`, "i") },
      { shortName: new RegExp(`^${escapeRegExp(cleanText(shortName))}$`, "i") }
    ]
  }).lean();

  if (!duplicateUniversity) return true;

  if (universityId && String(duplicateUniversity._id) === String(universityId)) {
    return true;
  }

  return false;
}

async function ensureUniqueResourceCategory({ categoryId = null, name, shortName }) {
  const duplicateCategory = await ResourceCategory.findOne({
    $or: [
      { name: new RegExp(`^${escapeRegExp(cleanText(name))}$`, "i") },
      { shortName: new RegExp(`^${escapeRegExp(cleanText(shortName))}$`, "i") }
    ]
  }).lean();

  if (!duplicateCategory) return true;

  if (categoryId && String(duplicateCategory._id) === String(categoryId)) {
    return true;
  }

  return false;
}

function validateEventPayload(body) {
  const title = cleanText(body.title);
  const category = String(body.category || "").trim().toLowerCase();
  const description = cleanText(body.description);
  const imagePath = String(body.imagePath || "").trim();
  const buttonType = String(body.buttonType || "").trim().toLowerCase();
  const detailsLink = String(body.detailsLink || "").trim();
  const maxPlayers = Number(body.maxPlayers);

  const allowedCategories = ["sports", "football", "padel", "music", "concert", "entertainment"];

  if (!isValidSimpleText(title, 3, 80)) {
    return { error: "Event title must be 3-80 characters and use safe characters only." };
  }

  if (!allowedCategories.includes(category)) {
    return { error: "Category must be sports, football, padel, music, concert, or entertainment." };
  }

  if (!isValidLongText(description, 10, 1500)) {
    return { error: "Event description must be 10-1500 characters." };
  }

  if (!isValidImagePath(imagePath)) {
    return { error: "Image must be a safe image path or image URL." };
  }

  if (!["register", "details"].includes(buttonType)) {
    return { error: "Button type must be register or details." };
  }

  if (detailsLink && !isSafePathOrUrl(detailsLink)) {
    return { error: "Details/location link must be a safe URL or path." };
  }

  if (buttonType === "details" && !detailsLink) {
    return { error: "Details link is required when button type is details." };
  }

  let finalMaxPlayers = 0;

  if (buttonType === "register") {
    if (!Number.isInteger(maxPlayers)) {
      return { error: "Max players must be a whole number." };
    }

    if (category === "padel" && maxPlayers !== 2) {
      return { error: "Padel must have exactly 2 players." };
    }

    if (category === "football" && (maxPlayers < 5 || maxPlayers > 20)) {
      return { error: "Football max players must be between 5 and 20." };
    }

    if (category !== "football" && category !== "padel" && (maxPlayers < 1 || maxPlayers > 20)) {
      return { error: "Max players must be between 1 and 20 for register events." };
    }

    finalMaxPlayers = maxPlayers;
  }

  return {
    eventData: {
      title,
      category,
      description,
      imagePath,
      buttonType,
      detailsLink,
      maxPlayers: finalMaxPlayers
    }
  };
}

function splitLines(value) {
  if (Array.isArray(value)) {
    return value.map(item => cleanText(item)).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map(item => cleanText(item))
    .filter(Boolean);
}

function validateUniversityPayload(body) {
  const name = cleanText(body.name);
  const shortName = cleanText(body.shortName).toUpperCase();
  const imagePath = String(body.imagePath || "").trim();
  const overview = cleanText(body.overview);
  const location = cleanText(body.location);
  const academics = splitLines(body.academics);
  const whyChoose = splitLines(body.whyChoose);
  const studentLife = splitLines(body.studentLife);
  const contactInfo = cleanText(body.contactInfo);
  const portalLink = String(body.portalLink || "").trim();

  if (!isValidSimpleText(name, 3, 100)) {
    return { error: "University name must be 3-100 characters and use safe characters only." };
  }

  if (!/^[A-Za-z0-9]{2,15}$/.test(shortName)) {
    return { error: "University short name must be 2-15 letters/numbers, like MIU or GUC." };
  }

  if (!isValidImagePath(imagePath)) {
    return { error: "University image must be a safe image path or image URL." };
  }

  if (!isValidLongText(overview, 20, 2000)) {
    return { error: "Overview must be 20-2000 characters." };
  }

  if (!isValidSimpleText(location, 2, 120)) {
    return { error: "Location must be 2-120 characters and use safe characters only." };
  }

  if (!isSafePathOrUrl(portalLink)) {
    return { error: "Portal link must be a safe URL or path." };
  }

  const listItems = [...academics, ...whyChoose, ...studentLife];

  if (listItems.some(item => !isValidSimpleText(item, 2, 160))) {
    return { error: "Academics, why choose, and student life items must be 2-160 characters and use safe characters only." };
  }

  if (contactInfo && contactInfo.length > 500) {
    return { error: "Contact info must be 500 characters or less." };
  }

  return {
    universityData: {
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
    }
  };
}

function validateResourcesText(resourcesText) {
  const lines = String(resourcesText || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: "Add at least one resource." };
  }

  if (lines.length > 50) {
    return { error: "You can add maximum 50 resources in one category." };
  }

  const resources = [];
  const allowedTypes = ["playlist", "website", "pdf", "book", "other"];

  for (let index = 0; index < lines.length; index++) {
    const parts = lines[index].split("|").map(part => cleanText(part));
    const title = parts[0] || "";
    const url = parts[1] || "";
    let type = String(parts[2] || "website").trim().toLowerCase();

    if (type === "video" || type === "tool") {
      type = "other";
    }

    if (!isValidSimpleText(title, 2, 100)) {
      return { error: `Resource ${index + 1}: title must be 2-100 characters and use safe characters only.` };
    }

    if (!isSafePathOrUrl(url)) {
      return { error: `Resource ${index + 1}: enter a valid URL or safe path.` };
    }

    if (!allowedTypes.includes(type)) {
      return { error: `Resource ${index + 1}: invalid resource type.` };
    }

    resources.push({ title, url, type });
  }

  return { resources };
}

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
    const name = cleanText(req.body.name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Avatar name is required."
      });
    }

    if (!isValidSimpleText(name, 2, 40)) {
      return res.status(400).json({
        success: false,
        message: "Avatar name must be 2-40 characters and use safe characters only."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required."
      });
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(req.file.originalname || "").toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG, and WEBP images are allowed."
      });
    }

    const existingAvatar = await Avatar.findOne({
      name: new RegExp(`^${escapeRegExp(name)}$`, "i")
    }).lean();

    if (existingAvatar) {
      return res.status(400).json({
        success: false,
        message: "Avatar name already exists."
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

    if (!isValidObjectIdString(avatarId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid avatar ID."
      });
    }

    const avatar = await Avatar.findByIdAndDelete(avatarId);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: "Avatar was not found."
      });
    }

    const uploadsRoot = path.resolve(__dirname, "..", "Public", "uploads", "avatars");
    const filePath = path.resolve(__dirname, "..", "Public", String(avatar.imagePath || ""));

    if (filePath.startsWith(uploadsRoot) && fs.existsSync(filePath)) {
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
    const name = cleanText(req.body.name);
    const shortName = cleanText(req.body.shortName);
    const color = String(req.body.color || "#0077b6").trim();

    if (!isValidSimpleText(name, 2, 80)) {
      return res.status(400).json({
        success: false,
        message: "Category name must be 2-80 characters and use safe characters only."
      });
    }

    if (!isValidSimpleText(shortName, 1, 16)) {
      return res.status(400).json({
        success: false,
        message: "Tab short name must be 1-16 characters and use safe characters only."
      });
    }

    if (!isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        message: "Color must be a valid hex color."
      });
    }

    const validatedResources = validateResourcesText(req.body.resourcesText);

    if (validatedResources.error) {
      return res.status(400).json({
        success: false,
        message: validatedResources.error
      });
    }

    const isUnique = await ensureUniqueResourceCategory({ name, shortName });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "Resource category name or short name already exists."
      });
    }

    const category = await ResourceCategory.create({
      name,
      shortName,
      color,
      resources: validatedResources.resources
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

    if (!isValidObjectIdString(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource category ID."
      });
    }

    const name = cleanText(req.body.name);
    const shortName = cleanText(req.body.shortName);
    const color = String(req.body.color || "#0077b6").trim();

    if (!isValidSimpleText(name, 2, 80)) {
      return res.status(400).json({
        success: false,
        message: "Category name must be 2-80 characters and use safe characters only."
      });
    }

    if (!isValidSimpleText(shortName, 1, 16)) {
      return res.status(400).json({
        success: false,
        message: "Tab short name must be 1-16 characters and use safe characters only."
      });
    }

    if (!isValidHexColor(color)) {
      return res.status(400).json({
        success: false,
        message: "Color must be a valid hex color."
      });
    }

    const validatedResources = validateResourcesText(req.body.resourcesText);

    if (validatedResources.error) {
      return res.status(400).json({
        success: false,
        message: validatedResources.error
      });
    }

    const isUnique = await ensureUniqueResourceCategory({ categoryId, name, shortName });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "Resource category name or short name already exists."
      });
    }

    const category = await ResourceCategory.findByIdAndUpdate(
      categoryId,
      {
        name,
        shortName,
        color,
        resources: validatedResources.resources
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

    if (!isValidObjectIdString(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID."
      });
    }

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

    fullName = cleanText(fullName);
    username = String(username || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    university = cleanText(university);
    major = cleanText(major);
    role = normalizeRole(role);

    const finalGender = normalizeGender(gender);

    if (!fullName || !username || !email || !finalGender || !university || !major || !role) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all user fields except password."
      });
    }

    if (!isValidFullName(fullName)) {
      return res.status(400).json({
        success: false,
        message: "Full name must contain at least first and last name, letters only."
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters, start with a letter, and use only letters, numbers, or underscore."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (university.length < 2 || university.length > 80) {
      return res.status(400).json({
        success: false,
        message: "University must be 2-80 characters."
      });
    }

    if (major.length < 2 || major.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Major must be 2-80 characters."
      });
    }

    const isUnique = await ensureUniqueUser({ userId, email, username });

    if (!isUnique) {
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
      if (!isValidStrongPassword(password)) {
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

    fullName = cleanText(fullName);
    username = String(username || "").trim();
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    university = cleanText(university);
    major = cleanText(major);
    role = normalizeRole(role);

    const finalGender = normalizeGender(gender);

    if (!fullName || !username || !email || !password || !finalGender || !university || !major || !role) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all user fields."
      });
    }

    if (!isValidFullName(fullName)) {
      return res.status(400).json({
        success: false,
        message: "Full name must contain at least first and last name, letters only."
      });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters, start with a letter, and use only letters, numbers, or underscore."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (!isValidStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      });
    }

    if (university.length < 2 || university.length > 80) {
      return res.status(400).json({
        success: false,
        message: "University must be 2-80 characters."
      });
    }

    if (major.length < 2 || major.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Major must be 2-80 characters."
      });
    }

    const isUnique = await ensureUniqueUser({ email, username });

    if (!isUnique) {
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

    if (!isValidObjectIdString(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID."
      });
    }

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

    const registrations = await EventRegistration.find({
      tournamentName: event.title
    }).select("_id teamName").lean();

    const allowedTeams = new Map(
      registrations.map(registration => [
        String(registration._id),
        registration.teamName || "Unnamed Team"
      ])
    );

    function validateBracketRound(roundData, expectedCount, roundName) {
      if (!Array.isArray(roundData)) {
        return {
          error: `${roundName} must be an array.`
        };
      }

      if (roundData.length !== expectedCount) {
        return {
          error: `${roundName} must have exactly ${expectedCount} slots.`
        };
      }

      const usedTeams = new Set();
      const finalRound = [];

      for (let i = 0; i < roundData.length; i++) {
        const item = roundData[i] || {};
        const registrationId = String(item.registrationId || "").trim();

        if (registrationId) {
          if (!isValidObjectIdString(registrationId) || !allowedTeams.has(registrationId)) {
            return {
              error: `${roundName} slot ${i + 1}: selected team does not belong to this event.`
            };
          }

          if (usedTeams.has(registrationId)) {
            return {
              error: `${roundName}: the same team cannot be selected twice.`
            };
          }

          usedTeams.add(registrationId);
        }

        finalRound.push({
          slot: i + 1,
          registrationId: registrationId || null,
          teamName: registrationId ? allowedTeams.get(registrationId) : ""
        });
      }

      return {
        finalRound
      };
    }

    const validatedRoundOf8 = validateBracketRound(roundOf8, 8, "Round of 8");
    const validatedSemiFinal = validateBracketRound(semiFinal, 4, "Semi Final");
    const validatedFinal = validateBracketRound(final, 2, "Final");

    const firstError = validatedRoundOf8.error || validatedSemiFinal.error || validatedFinal.error;

    if (firstError) {
      return res.status(400).json({
        success: false,
        message: firstError
      });
    }

    const winnerId = String(winner?.registrationId || "").trim();

    if (winnerId && (!isValidObjectIdString(winnerId) || !allowedTeams.has(winnerId))) {
      return res.status(400).json({
        success: false,
        message: "Winner must be a registered team for this event."
      });
    }

    event.bracket = {
      roundOf8: validatedRoundOf8.finalRound,
      semiFinal: validatedSemiFinal.finalRound,
      final: validatedFinal.finalRound,
      winner: {
        teamName: winnerId ? allowedTeams.get(winnerId) : "",
        registrationId: winnerId || null
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
    const validated = validateEventPayload(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const isUnique = await ensureUniqueEventTitle({
      title: validated.eventData.title
    });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "Event title already exists."
      });
    }

    const event = await Event.create(validated.eventData);

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

    if (!isValidObjectIdString(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID."
      });
    }

    const validated = validateEventPayload(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const isUnique = await ensureUniqueEventTitle({
      eventId,
      title: validated.eventData.title
    });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "Event title already exists."
      });
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      validated.eventData,
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


router.post("/admin/api/universities", requireAdminApi, async (req, res) => {
  try {
    const validated = validateUniversityPayload(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const isUnique = await ensureUniqueUniversity({
      name: validated.universityData.name,
      shortName: validated.universityData.shortName
    });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "University name or short name already exists."
      });
    }

    const university = await University.create(validated.universityData);

    res.json({
      success: true,
      message: "University added successfully.",
      university
    });

  } catch (error) {
    console.error("Admin add university error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not add university."
    });
  }
});

router.patch("/admin/api/universities/:universityId", requireAdminApi, async (req, res) => {
  try {
    const { universityId } = req.params;

    if (!isValidObjectIdString(universityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid university ID."
      });
    }

    const validated = validateUniversityPayload(req.body);

    if (validated.error) {
      return res.status(400).json({
        success: false,
        message: validated.error
      });
    }

    const isUnique = await ensureUniqueUniversity({
      universityId,
      name: validated.universityData.name,
      shortName: validated.universityData.shortName
    });

    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "University name or short name already exists."
      });
    }

    const university = await University.findByIdAndUpdate(
      universityId,
      validated.universityData,
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
