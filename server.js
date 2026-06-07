const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const User = require("./models/user");
const StudyProfile = require("./models/StudyProfile");
const GameScore = require("./models/gamescore");
const Event = require("./models/Events");
const EventRegistration = require("./models/eventsReg");
const University = require("./models/Universities");
const { requireAuth, requirePageAuth } = require("./middleware/authMiddleware");
const ResourceCategory = require("./models/resources");
const crypto = require("crypto");
const MatchRequest = require("./models/MatchReq");
const Chat = require("./models/chat");
const multer = require("multer");
const dns = require("node:dns");
const fs = require("fs");
const Avatar = require("./models/Avatar");
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

connectDB();

const avatarUploadDir = path.join(__dirname, "Public", "uploads", "avatars");

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ANSWER_STYLE = `
You are Study Buddy AI, powered by Gemini.
You are an open general assistant, not a preset study bot.
Answer the user's actual question directly.
Do not force the answer into Algorithms, C++, Data Structures, Exams, or any preset topic.
Do not use canned replies.

Style:
- Be natural, direct, and helpful.
- Keep answers short, but include enough detail to be useful.
- If the user asks for code, give working code and explain only the important parts.
- If the user asks something simple, answer simply.
- If the user is frustrated, stay calm and fix the problem.
- Use the same language/style the user uses when appropriate.
- Do not answer any plant related questions.
`;

console.log("Gemini key loaded:", Boolean(GEMINI_API_KEY));
console.log("Gemini model:", GEMINI_MODEL);

const getGeminiAI = async () => {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const { GoogleGenAI } = await import("@google/genai");

  return new GoogleGenAI({
    apiKey: GEMINI_API_KEY
  });
};

const getEmailUser = () => {
  return String(process.env.EMAIL_USER || "").trim();
};

const getEmailPass = () => {
  return String(process.env.EMAIL_PASS || "").replace(/\s/g, "");
};

const ipv4Lookup = (hostname, options, callback) => {
  return dns.lookup(hostname, { family: 4 }, callback);
};

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    lookup: ipv4Lookup,
    family: 4,

    auth: {
      user: getEmailUser(),
      pass: getEmailPass()
    },

    tls: {
      servername: "smtp.gmail.com"
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
};

console.log("EMAIL_USER exists:", !!getEmailUser());
console.log("EMAIL_PASS exists:", !!getEmailPass());
console.log("EMAIL_USER value:", getEmailUser());

if (getEmailUser() && getEmailPass()) {
  createEmailTransporter().verify((error) => {
    if (error) {
      console.error("EMAIL TRANSPORTER ERROR:", error);
    } else {
      console.log("EMAIL SERVER IS READY TO SEND MESSAGES");
    }
  });
}

const sendSignupEmail = async (userEmail, fullName) => {
  if (!getEmailUser() || !getEmailPass()) {
    console.warn("Signup email was not sent because EMAIL_USER or EMAIL_PASS is missing.");
    return;
  }

  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${getEmailUser()}>`,
    to: userEmail,
    subject: "Welcome to Study Buddy",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Study Buddy!</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for signing up to Study Buddy.</p>
        <p>You can now log in and start finding study partners.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `
  });

  console.log("Signup email sent successfully to:", userEmail);
};


const sendPasswordResetLinkEmail = async (userEmail, fullName, resetLink) => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${getEmailUser()}>`,
    to: userEmail,
    subject: "Reset your Study Buddy password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #111827;">
        <h2>Reset Your Password</h2>

        <p>Hello ${fullName || "Student"},</p>

        <p>You requested to reset your Study Buddy password.</p>

        <p>Click the button below to confirm your new password.</p>

        <a href="${resetLink}" 
           target="_blank"
           style="
            display: inline-block;
            margin-top: 14px;
            padding: 14px 22px;
            background: #7c3aed;
            color: #ffffff;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
           ">
          Confirm New Password
        </a>

        <p style="margin-top: 18px;">
          This link will expire in 15 minutes.
        </p>

        <p>If you did not request this, ignore this email.</p>

        <br>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `
  });
};

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
  const transporter = createEmailTransporter();

  const locationLink = eventDetailsLink && String(eventDetailsLink).trim() ? String(eventDetailsLink).trim() : "Location link was not added yet.";

  const safeDescription = eventDescription && String(eventDescription).trim() ? String(eventDescription).trim() : "No event description was added.";

  const cleanedCategory = String(eventCategory || "").toLowerCase();
  const cleanedTitle = String(tournamentName || "").toLowerCase();

  const eventType = cleanedCategory.includes("padel") || cleanedTitle.includes("padel") ? "Padel Tournament" : cleanedCategory.includes("football") ||
    cleanedCategory.includes("sports") || cleanedTitle.includes("football") ? "Football Tournament" : "Sports Tournament";

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

  await transporter.sendMail({
   from: `Study Buddy <${getEmailUser()}>`,
    to,
    subject: `Registration Confirmed - ${tournamentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background: #111827; color: #f9fafb; padding: 28px; max-width: 720px; margin: auto; border-radius: 18px;">

        <p style="margin: 0 0 12px; color: #86efac; font-size: 14px; font-weight: bold;">
          Accepted
        </p>

        <h1 style="margin: 0 0 18px; font-size: 28px; color: #ffffff;">
          Booking accepted
        </h1>

        <p style="font-size: 16px; line-height: 1.7; color: #d1d5db;">
          Hey <strong style="color: #ffffff;">${leaderName}</strong> — your registration request has been accepted.
          Your team has been registered successfully.
        </p>

        <div style="margin-top: 26px; padding: 22px; border-radius: 14px; background: #1f2937; border: 1px solid #374151;">
          <h2 style="margin: 0 0 18px; color: #ffffff; font-size: 22px;">
            Registered booking
          </h2>

          <table style="width: 100%; border-collapse: collapse; color: #e5e7eb;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Event</td>
              <td style="padding: 8px 0; font-weight: bold;">${tournamentName}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Type</td>
              <td style="padding: 8px 0;">${eventType}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Team name</td>
              <td style="padding: 8px 0;">${teamName}</td>
            </tr>

            <tr>
              <td style="padding: 8px 0; color: #9ca3af;">Location</td>
              <td style="padding: 8px 0;">
                <a href="${locationLink}" target="_blank" style="color: #60a5fa;">
                  ${locationLink}
                </a>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 22px; padding: 22px; border-radius: 14px; background: #1f2937; border: 1px solid #374151;">
          <h2 style="margin: 0 0 14px; color: #ffffff; font-size: 22px;">
            Event details
          </h2>

          <p style="margin: 0; color: #d1d5db; font-size: 16px; line-height: 1.7;">
            ${safeDescription}
          </p>
        </div>

        <div style="margin-top: 22px; padding: 22px; border-radius: 14px; background: #1f2937; border: 1px solid #374151;">
          <h2 style="margin: 0 0 14px; color: #ffffff; font-size: 22px;">
            Team players
          </h2>

          <table style="width: 100%; border-collapse: collapse; background: #111827; border-radius: 12px; overflow: hidden;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 10px; background: #374151; color: #ffffff;">#</th>
                <th style="text-align: left; padding: 10px; background: #374151; color: #ffffff;">Name</th>
              </tr>
            </thead>

            <tbody style="color: #e5e7eb;">
              ${playersList}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 26px;">
          <p style="margin: 0 0 10px; color: #d1d5db;">
            Try to arrive early and keep this email with you.
          </p>

          <a href="${locationLink}" target="_blank" style="display: inline-block; margin-top: 10px; color: #60a5fa; font-size: 16px;">
            Open location
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #374151; margin: 28px 0;">

        <p style="margin: 0; color: #9ca3af; font-size: 14px;">
          This is a service notification — replies are not monitored.
        </p>

        <p style="margin: 8px 0 0; color: #86efac; font-size: 14px;">
          © 2026 Study Buddy
        </p>

      </div>
    `
  });
};

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use("/css", express.static(path.join(__dirname, "Public", "css")));
app.use("/javaScript", express.static(path.join(__dirname, "Public", "javaScript")));
app.use("/assests", express.static(path.join(__dirname, "Public", "assests")));
app.use("/uploads/avatars", express.static(path.join(__dirname, "Public", "uploads", "avatars")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "studybuddysecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 6
    }
  })
);

app.use(flash());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again later."
});

// EJS global variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
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

app.get("/admin/api/overview", requireAdminApi, async (req, res) => {
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

app.get("/api/avatars", async (req, res) => {
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

app.get("/admin/api/avatars", requireAdminApi, async (req, res) => {
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

app.post("/admin/api/avatars", requireAdminApi, avatarUpload.single("avatarImage"), async (req, res) => {
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

app.delete("/admin/api/avatars/:avatarId", requireAdminApi, async (req, res) => {
  try {
    const { avatarId } = req.params;

    const avatar = await Avatar.findByIdAndDelete(avatarId);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: "Avatar was not found."
      });
    }

    const filePath = path.join(__dirname, "Public", avatar.imagePath);

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

app.get("/admin/api/resources", requireAdminApi, async (req, res) => {
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

app.post("/admin/api/resources", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/resources/:categoryId", requireAdminApi, async (req, res) => {
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

app.delete("/admin/api/resources/:categoryId", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/users/:userId", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/users", requireAdminApi, async (req, res) => {
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

app.post("/admin/api/users", requireAdminApi, async (req, res) => {
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

   const existingUsername = await User.findOne({
  username: cleanedUsername
});

if (existingUsername) {
  return renderSignupError(
    res,
    "Username already exists. Please choose another username.",
    oldInput
  );
}

const existingEmail = await User.findOne({
  email: cleanedEmail
});

if (existingEmail) {
  return renderSignupError(
    res,
    "Email already exists. Please login instead.",
    oldInput
  );
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

app.get("/admin/api/study-profiles", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/event-registrations", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/events/:eventId/bracket", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/game-scores", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/events/:eventId/bracket", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/events", requireAdminApi, async (req, res) => {
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

app.get("/admin/api/universities", requireAdminApi, async (req, res) => {
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

app.post("/admin/api/events", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/events/:eventId", requireAdminApi, async (req, res) => {
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

app.delete("/admin/api/events/:eventId", requireAdminApi, async (req, res) => {
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

app.delete("/admin/api/event-registrations/:registrationId", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/events/:eventId/bracket/reset", requireAdminApi, async (req, res) => {
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

app.post("/admin/api/universities", requireAdminApi, async (req, res) => {
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

app.patch("/admin/api/universities/:universityId", requireAdminApi, async (req, res) => {
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

app.delete("/admin/api/universities/:universityId", requireAdminApi, async (req, res) => {
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
      .filter(Boolean)
  )];
};

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  if (req.query.returnTo && req.query.returnTo.startsWith("/")) {
    req.session.returnTo = req.query.returnTo;
  }

  res.render("login");
});

app.post("/login", authLimiter,async (req, res) => {
  try {
    const cleanedUsername = String(req.body.username || "").trim();
    const cleanedPassword = String(req.body.password || "");

    if (!cleanedUsername || !cleanedPassword) {
      req.flash("error", "Please enter username and password.");
      return res.redirect("/login");
    }

    const user = await User.findOne({
      username: cleanedUsername
    });

    if (!user) {
      req.flash("error", "Invalid username or password.");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(cleanedPassword, user.password);

    if (!isMatch) {
      req.flash("error", "Invalid username or password.");
      return res.redirect("/login");
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      university: user.university,
      major: user.major,
      gender: user.gender,
      avatar: user.avatar || "",
      role: user.role || "student"
    };

    let redirectTo = req.session.returnTo || "/cylinder";
    delete req.session.returnTo;

    if (req.session.user.role === "admin") {
      redirectTo = "/admin";
    }

    req.session.save(() => {
      res.redirect(redirectTo);
    });

  } catch (error) {
    console.error("Login error:", error);
    req.flash("error", "Something went wrong.");
    res.redirect("/login");
  }
});

async function renderSignupError(res, message, oldInput) {
  const avatars = await Avatar.find()
    .sort({ createdAt: 1 })
    .lean();

  return res.status(400).render("signup", {
    error: [message],
    success: [],
    oldInput,
    avatars
  });
}

app.get("/signup", async (req, res) => {
  try {
    const avatars = await Avatar.find()
      .sort({ createdAt: 1 })
      .lean();

    res.render("signup", {
      oldInput: {},
      error: [],
      success: [],
      avatars
    });

  } catch (error) {
    console.error("Signup avatars load error:", error);

    res.render("signup", {
      oldInput: {},
      error: [],
      success: [],
      avatars: []
    });
  }
});

app.post("/signup", authLimiter, async (req, res) => {
  try {
    let {
      fullName,
      username,
      gender,
      university,
      major,
      email,
      password,
      confirmPassword,
      avatar
    } = req.body;

    const cleanedFullName = String(fullName || "").trim().replace(/\s+/g, " ");
    const cleanedUsername = String(username || "").trim();
    const cleanedGenderRaw = String(gender || "").trim().toLowerCase();
    const cleanedUniversity = String(university || "").trim();
    const cleanedMajor = String(major || "").trim();
    const cleanedEmail = String(email || "").trim().toLowerCase();
    const cleanedPassword = String(password || "");
    const cleanedConfirmPassword = String(confirmPassword || "");
    const cleanedAvatar = String(avatar || "").trim();

    const oldInput = {
      fullName: cleanedFullName,
      username: cleanedUsername,
      gender: cleanedGenderRaw,
      university: cleanedUniversity,
      major: cleanedMajor,
      email: cleanedEmail,
      avatar: cleanedAvatar
    };

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
      !cleanedMajor ||
      !cleanedEmail ||
      !cleanedPassword ||
      !cleanedConfirmPassword
    ) {
      return renderSignupError(res, "Please fill in all fields.", oldInput);
    }

    const fullNameRegex = /^[A-Za-z]+(?: [A-Za-z]+)+$/;

    if (!fullNameRegex.test(cleanedFullName)) {
      return renderSignupError(
        res,
        "Full name must contain first and last name using letters only.",
        oldInput
      );
    }

    if (cleanedFullName.length < 5 || cleanedFullName.length > 60) {
      return renderSignupError(
        res,
        "Full name must be between 5 and 60 characters.",
        oldInput
      );
    }

    const usernameRegex = /^[A-Za-z_]{3,20}$/;

    if (!usernameRegex.test(cleanedUsername)) {
      return renderSignupError(
        res,
        "Username must be 3-20 characters and only contain letters and underscores.",
        oldInput
      );
    }

    if (cleanedUniversity.length < 2 || cleanedUniversity.length > 80) {
      return renderSignupError(res, "Please enter a valid university.", oldInput);
    }

    if (cleanedMajor.length < 2 || cleanedMajor.length > 80) {
      return renderSignupError(res, "Please enter a valid major.", oldInput);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanedEmail)) {
    return renderSignupError(res, "Please enter a valid email.", oldInput);
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!passwordRegex.test(cleanedPassword)) {
      return renderSignupError(
        res,
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
        oldInput
      );
    }

    if (cleanedPassword !== cleanedConfirmPassword) {
      return renderSignupError(res, "Passwords do not match.", oldInput);
    }

    const existingUser = await User.findOne({
      $or: [
        { email: cleanedEmail },
        { username: cleanedUsername }
      ]
    });

    if (existingUser) {
      return renderSignupError(
        res,
        "Email or username already exists.",
        oldInput
      );
    }

    if (!cleanedAvatar) {
      return await renderSignupError(res, "Please choose an avatar.", oldInput);
    }

    const selectedAvatar = await Avatar.findOne({
     imagePath: cleanedAvatar
    }).lean();

    if (!selectedAvatar) {
      return await renderSignupError(res, "Please choose a valid avatar.", oldInput);
    }

    const hashedPassword = await bcrypt.hash(cleanedPassword, 10);

    await User.create({
      fullName: cleanedFullName,
      username: cleanedUsername,
      gender: finalGender,
      university: cleanedUniversity,
      major: cleanedMajor,
      email: cleanedEmail,
      password: hashedPassword,
      avatar: selectedAvatar.imagePath,
      role: "student"
    });

    sendSignupEmail(cleanedEmail, cleanedFullName).catch((emailError) => {
      console.error("Signup email failed, but account was created:", emailError);
    });

    req.flash("success", "Account created successfully. Please log in.");
      return res.redirect("/login");

  } catch (error) {
    console.error("Signup error:", error);

    return renderSignupError(
      res,
      error.message || "Something went wrong.",
      {
        fullName: req.body.fullName || "",
        username: req.body.username || "",
        gender: req.body.gender || "",
        university: req.body.university || "",
        major: req.body.major || "",
        email: req.body.email || ""
      }
    );
  }
});
const passwordResetTokens = new Map();
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    error: [],
    success: []
  });
});

app.get("/forget-password", (req, res) => {
  res.redirect("/forgot-password");
});

app.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).render("forgot-password", {
        error: ["Please enter your email."],
        success: []
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).render("forgot-password", {
        error: ["No account found with this email."],
        success: []
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    passwordResetTokens.set(token, {
      email: user.email,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetLink = `${baseUrl}/reset-password/${token}`;

    await sendPasswordResetLinkEmail(user.email, user.fullName, resetLink);

    return res.render("forgot-password", {
      error: [],
      success: ["Password reset link sent to your email."]
    });

  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).render("forgot-password", {
      error: ["Something went wrong. Please try again."],
      success: []
    });
  }
});

app.get("/reset-password/:token", (req, res) => {
  const token = String(req.params.token || "");
  const resetData = passwordResetTokens.get(token);

  if (!resetData) {
    req.flash("error", "Reset link is invalid or expired.");
    return res.redirect("/forgot-password");
  }

  if (Date.now() > resetData.expiresAt) {
    passwordResetTokens.delete(token);

    req.flash("error", "Reset link expired. Please request a new link.");
    return res.redirect("/forgot-password");
  }

  return res.render("reset-password", {
    token,
    error: [],
    success: []
  });
});

app.post("/reset-password/:token", authLimiter, async (req, res) => {
  try {
    const token = String(req.params.token || "");
    const resetData = passwordResetTokens.get(token);

    if (!resetData) {
      return res.status(400).render("forgot-password", {
        error: ["Reset link is invalid or expired."],
        success: []
      });
    }

    if (Date.now() > resetData.expiresAt) {
      passwordResetTokens.delete(token);

      return res.status(400).render("forgot-password", {
        error: ["Reset link expired. Please request a new link."],
        success: []
      });
    }

    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).render("reset-password", {
        token,
        error: ["Password must be at least 8 characters and include uppercase, lowercase, number, and special character."],
        success: []
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("reset-password", {
        token,
        error: ["Passwords do not match."],
        success: []
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findOneAndUpdate(
      { email: resetData.email },
      { password: hashedPassword },
      { runValidators: true }
    );

    passwordResetTokens.delete(token);

    req.flash("success", "Password reset successfully. Please log in.");
    return res.redirect("/login");

  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).render("reset-password", {
      token: req.params.token,
      error: ["Could not reset password."],
      success: []
    });
  }
});

app.get("/mainpage", (req, res) => {
  res.render("index");
});

app.get("/profile", requirePageAuth, async (req, res) => {
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

app.post("/profile/update-info", requirePageAuth, async (req, res) => {
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

app.post("/profile/update-study-list", requirePageAuth, async (req, res) => {
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

app.post("/profile/competition/:registrationId/update", requirePageAuth, async (req, res) => {
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


app.post("/profile/competition/:registrationId/forfeit", requirePageAuth, async (req, res) => {
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


app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


app.get("/api/matching/profile", requireAuth, async (req, res) => {
  try {
    const profile = await StudyProfile.findOne({
      user: req.session.user.id
    });

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error("Get matching profile error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load your study profile."
    });
  }
});

app.post("/api/matching/profile/clear", requireAuth, async (req, res) => {
  try {
    const profile = await StudyProfile.findOneAndUpdate(
      {
        user: req.session.user.id
      },
      {
        weakSubjects: [],
        strongSubjects: []
      },
      {
        new: true
      }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Study profile was not found."
      });
    }

    return res.json({
      success: true,
      message: "Study list cleared.",
      profile
    });

  } catch (error) {
    console.error("Clear study profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not clear your study list."
    });
  }
});

const sendMatchRequestEmail = async ({
  to,
  receiverName,
  senderName,
  senderWeakSubject,
  senderStrongSubject,
  acceptLink,
  rejectLink
}) => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${getEmailUser()}>`,
    to,
    subject: "New Study Buddy Match Request",
    html: `
      <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 28px; max-width: 680px; margin: auto; border-radius: 18px;">
        <h1 style="margin-top: 0; color: #ffffff;">New Study Match Request</h1>

        <p style="font-size: 16px; line-height: 1.7; color: #dbeafe;">
          Hi <strong>${receiverName}</strong>,
        </p>

        <p style="font-size: 16px; line-height: 1.7; color: #d1d5db;">
          <strong>${senderName}</strong> wants to match with you on Study Buddy.
        </p>

        <div style="margin: 22px 0; padding: 18px; background: #1e293b; border-radius: 14px; border: 1px solid #334155;">
          <p style="margin: 0 0 10px; color: #fca5a5;">
            <strong>${senderName} needs help with:</strong> ${senderWeakSubject}
          </p>

          <p style="margin: 0; color: #86efac;">
            <strong>${senderName} can help with:</strong> ${senderStrongSubject}
          </p>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 26px;">
          <a href="${acceptLink}" target="_blank" style="display: inline-block; background: #22c55e; color: white; padding: 13px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
            Accept Request
          </a>

          <a href="${rejectLink}" target="_blank" style="display: inline-block; background: #ef4444; color: white; padding: 13px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">
            Reject Request
          </a>
        </div>

        <p style="margin-top: 26px; color: #94a3b8; font-size: 14px;">
          Only accept if you want to open a private study chat with this student.
        </p>
      </div>
    `
  });
};

const createJitsiRoom = () => {
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const roomId = `studybuddy-${Date.now()}-${randomCode}`;

  const jitsiConfig =
    "#config.startWithVideoMuted=true" +
    "&config.startWithAudioMuted=true" +
    "&config.toolbarButtons=%5B%22microphone%22%2C%22chat%22%2C%22participants-pane%22%2C%22tileview%22%2C%22hangup%22%5D";

  return {
    roomId,
    meetingLink: `https://meet.jit.si/${roomId}${jitsiConfig}`
  };
};

const formatMatchSchedule = (scheduledAt) => {
  if (!scheduledAt) return "Not scheduled.";

  return new Date(scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const sendChatMatchEmail = async (matchRequest) => {
  if (matchRequest.emailSentAt) {
    return {
      alreadySent: true,
      meetingLink: matchRequest.meetingLink
    };
  }

  const freshRequest = await MatchRequest.findById(matchRequest._id);

  if (!freshRequest) {
    throw new Error("Match request was not found.");
  }

  const senderUser = await User.findById(freshRequest.sender).lean();
  const receiverUser = await User.findById(freshRequest.receiver).lean();

  const senderEmail =
    freshRequest.senderEmail ||
    senderUser?.email ||
    "";

  const receiverEmail =
    freshRequest.receiverEmail ||
    receiverUser?.email ||
    "";

  const senderName =
    freshRequest.senderName ||
    senderUser?.fullName ||
    senderUser?.username ||
    "Student";

  const receiverName =
    freshRequest.receiverName ||
    receiverUser?.fullName ||
    receiverUser?.username ||
    "Student";

  const emailList = [...new Set(
    [senderEmail, receiverEmail]
      .map(email => String(email || "").trim().toLowerCase())
      .filter(Boolean)
  )];

  if (emailList.length < 2) {
    throw new Error("Both student emails were not found.");
  }

  const room = createJitsiRoom();

  freshRequest.roomId = room.roomId;
  freshRequest.meetingLink = room.meetingLink;
  freshRequest.emailSentAt = new Date();
  freshRequest.status = "matched";

  await freshRequest.save();

  const transporter = createEmailTransporter();

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 650px; margin: auto; padding: 20px;">
      <div style="background: #f7f9fc; padding: 24px; border-radius: 14px; border: 1px solid #e5e7eb;">
        <h2 style="margin-top: 0; color: #1f2937;">Your Study Buddy Room is Ready</h2>

        <p>
          A study match has been created between
          <strong>${senderName}</strong> and <strong>${receiverName}</strong>.
        </p>

        <div style="margin: 18px 0; padding: 16px; border-radius: 12px; background: #eef2ff; border: 1px solid #c7d2fe;">
          <p style="margin: 0; color: #1e1b4b;">
            <strong>Subject:</strong><br>
            ${freshRequest.senderWeakSubject || freshRequest.receiverWeakSubject || "Study session"}
          </p>
        </div>

        <p>
          <strong>Meeting Time:</strong><br>
          ${formatMatchSchedule(freshRequest.scheduledAt)}
        </p>

        <p>
          <strong>Room ID:</strong><br>
          ${freshRequest.roomId}
        </p>

        <p>
          <strong>Video Room Link:</strong><br>
          <a href="${freshRequest.meetingLink}" target="_blank" style="color: #2563eb; word-break: break-all;">
            ${freshRequest.meetingLink}
          </a>
        </p>

        <p>Click the link above to join the meeting.</p>
      </div>

      <div style="margin-top: 22px; background: #fff1f2; padding: 24px; border-radius: 14px; border: 1px solid #fecdd3;">
        <h2 style="margin-top: 0; color: #991b1b;">Study Room Rules</h2>

        <p>1. We only connect people for studying purposes.</p>
        <p>2. Respect your colleagues in the meet.</p>
        <p>3. If you joined the call and no one entered after 5 minutes, you have the right to leave the meet.</p>
        <p>4. You must be logged in to the website for the meet to start.</p>
        <p>5. You must enter using a laptop.</p>
      </div>

      <p style="margin-top: 22px;">
        Best regards,<br>
        <strong>Study Buddy Team</strong>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `Study Buddy <${getEmailUser()}>`,
    to: emailList.join(", "),
    subject: "Your Study Buddy Video Room",
    html: emailHtml
  });

  return {
    alreadySent: false,
    meetingLink: freshRequest.meetingLink
  };
};

const checkScheduledChatMatches = async () => {
  try {
    const dueRequests = await MatchRequest.find({
      status: "rescheduled",
      scheduledAt: { $lte: new Date() },
      emailSentAt: null
    }).limit(20);

    for (const request of dueRequests) {
      await sendChatMatchEmail(request);
      console.log(`Scheduled chat match email sent for request ${request._id}`);
    }
  } catch (error) {
    console.error("Scheduled chat match checker error:", error);
  }
};

setInterval(checkScheduledChatMatches, 60 * 1000);

const CS_SUBJECTS = [
  "None",
  "Programming",
  "Object Oriented Programming",
  "Data Structures",
  "Algorithms",
  "Database",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Web Development",
  "Artificial Intelligence",
  "Machine Learning",
  "Cybersecurity",
  "Computer Architecture",
  "Discrete Mathematics",
  "Calculus",
  "Linear Algebra",
  "Physics",
  "Math"
];

function isValidCSSubject(subject) {
  return CS_SUBJECTS.includes(String(subject || "").trim());
}

app.post("/api/matching/request/:requestId/accept", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      receiver: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request is already ${matchRequest.status}.`
      });
    }

    const chat = await Chat.create({
      participants: [matchRequest.sender, matchRequest.receiver],
      matchRequest: matchRequest._id,
      messages: []
    });

    matchRequest.status = "accepted";
    matchRequest.chat = chat._id;
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request accepted. Chat opened.",
      chatId: chat._id
    });

  } catch (error) {
    console.error("Accept match request API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not accept match request."
    });
  }
});

app.post("/api/matching/request/:requestId/reject", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      receiver: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request is already ${matchRequest.status}.`
      });
    }

    matchRequest.status = "rejected";
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request rejected."
    });

  } catch (error) {
    console.error("Reject match request API error:", error);

    res.status(500).json({
      success: false,
      message: "Could not reject match request."
    });
  }
});

app.get("/api/matching/subjects", requireAuth, (req, res) => {
  res.json({
    success: true,
    subjects: CS_SUBJECTS
  });
});
app.post("/api/matching/search", requireAuth, async (req, res) => {
  try {
    const weakSubjects = Array.isArray(req.body.weakSubjects)
      ? req.body.weakSubjects.map(subject => String(subject).trim()).filter(Boolean)
      : [];

    const strongSubjects = Array.isArray(req.body.strongSubjects)
      ? req.body.strongSubjects.map(subject => String(subject).trim()).filter(Boolean)
      : [];

    if (weakSubjects.length === 0 || strongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject and one strong subject."
      });
    }

    const invalidSubject = [...weakSubjects, ...strongSubjects].find(subject => {
      return !isValidCSSubject(subject);
    });

    if (invalidSubject) {
      return res.status(400).json({
        success: false,
        message: "Please choose valid subjects only."
      });
    }

    const duplicatedSubject = weakSubjects.find(subject => {
      return strongSubjects.includes(subject);
    });

    if (duplicatedSubject) {
      return res.status(400).json({
        success: false,
        message: "The same subject cannot be both weak and strong."
      });
    }

    const currentUser = await User.findById(req.session.user.id).lean();

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User was not found."
      });
    }

    await StudyProfile.findOneAndUpdate(
      { user: currentUser._id },
      {
        user: currentUser._id,
        fullName: currentUser.fullName,
        username: currentUser.username,
        email: currentUser.email,
        university: currentUser.university || "",
        major: currentUser.major || "",
        weakSubjects,
        strongSubjects
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    const profiles = await StudyProfile.find({
      user: { $ne: currentUser._id },
      university: currentUser.university,
      major: currentUser.major,
      strongSubjects: { $in: weakSubjects }
    }).lean();

    const matches = profiles.map(profile => {
      const otherWeakSubjects = profile.weakSubjects || [];
      const otherStrongSubjects = profile.strongSubjects || [];

      const canHelpMe = weakSubjects.filter(subject =>
        otherStrongSubjects.includes(subject)
      );

      const iCanHelpThem = strongSubjects.filter(subject =>
        otherWeakSubjects.includes(subject)
      );

      const isPerfectMatch = canHelpMe.length > 0 && iCanHelpThem.length > 0;

      return {
        profileId: profile._id,
        userId: profile.user,
        fullName: profile.fullName,
        username: profile.username,
        email: profile.email,
        university: profile.university,
        major: profile.major,
        weakSubjects: otherWeakSubjects,
        strongSubjects: otherStrongSubjects,
        canHelpMe,
        iCanHelpThem,
        matchType: isPerfectMatch ? "Perfect Match" : "Helper Match"
      };
    });

    res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error("Matching search error:", error);

    res.status(500).json({
      success: false,
      message: "Could not search for matches."
    });
  }
});
app.post("/api/matching/request", requireAuth, async (req, res) => {
  try {
    const {
      receiverProfileId,
      weakSubject,
      strongSubject
    } = req.body;

    const senderWeakSubject = String(weakSubject || "").trim();
    const senderStrongSubject = String(strongSubject || "").trim();

    if (!receiverProfileId) {
      return res.status(400).json({
        success: false,
        message: "Matched student was not selected."
      });
    }

    if (!isValidCSSubject(senderWeakSubject) || !isValidCSSubject(senderStrongSubject)) {
      return res.status(400).json({
        success: false,
        message: "Please choose valid weak and strong subjects."
      });
    }

    if (senderWeakSubject === senderStrongSubject) {
      return res.status(400).json({
        success: false,
        message: "Weak subject and strong subject cannot be the same."
      });
    }

    const sender = await User.findById(req.session.user.id).lean();

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender was not found."
      });
    }

    const receiverProfile = await StudyProfile.findById(receiverProfileId).lean();

    if (!receiverProfile) {
      return res.status(404).json({
        success: false,
        message: "Matched student was not found."
      });
    }

    if (String(receiverProfile.user) === String(sender._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a match request to yourself."
      });
    }

    if (
      receiverProfile.university !== sender.university ||
      receiverProfile.major !== sender.major
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only match with students from your same university and major."
      });
    }

    if (!(receiverProfile.strongSubjects || []).includes(senderWeakSubject)) {
      return res.status(400).json({
        success: false,
        message: "This student is not a valid helper for your weak subject."
      });
    }

    const existingPending = await MatchRequest.findOne({
      sender: sender._id,
      receiver: receiverProfile.user,
      status: "pending"
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already sent a pending request to this student."
      });
    }

    const emailToken = crypto.randomBytes(32).toString("hex");

    const matchRequest = await MatchRequest.create({
      sender: sender._id,
      receiver: receiverProfile.user,

      senderName: sender.fullName || sender.username,
      senderEmail: sender.email,

      receiverName: receiverProfile.fullName,
      receiverEmail: receiverProfile.email,

      senderWeakSubject,
      senderStrongSubject,

      receiverWeakSubject: (receiverProfile.weakSubjects || [])[0] || "",
      receiverStrongSubject: senderWeakSubject,

      emailToken
    });

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

    const acceptLink = `${baseUrl}/matching/request/${matchRequest._id}/accept?token=${emailToken}`;
    const rejectLink = `${baseUrl}/matching/request/${matchRequest._id}/reject?token=${emailToken}`;

    await sendMatchRequestEmail({
      to: receiverProfile.email,
      receiverName: receiverProfile.fullName,
      senderName: sender.fullName || sender.username,
      senderWeakSubject,
      senderStrongSubject,
      acceptLink,
      rejectLink
    });

    res.json({
      success: true,
      message: `Match request sent to ${receiverProfile.fullName}.`
    });

  } catch (error) {
    console.error("Send match request error:", error);

    res.status(500).json({
      success: false,
      message: "Could not send match request."
    });
  }
});

app.get("/matching/request/:requestId/accept", async (req, res) => {
  try {
    const { requestId } = req.params;
    const token = String(req.query.token || "");

    const matchRequest = await MatchRequest.findById(requestId);

    if (!matchRequest || matchRequest.emailToken !== token) {
      return res.status(404).render("ERROR");
    }

    if (matchRequest.status !== "pending") {
      return res.send(`
        <div style="font-family: Arial; max-width: 520px; margin: 80px auto; text-align: center;">
          <h1>This request is already ${matchRequest.status}.</h1>
          <a href="/matching">Back to Matching</a>
        </div>
      `);
    }

    const chat = await Chat.create({
      participants: [matchRequest.sender, matchRequest.receiver],
      matchRequest: matchRequest._id,
      messages: []
    });

    matchRequest.status = "accepted";
    matchRequest.chat = chat._id;
    await matchRequest.save();

    res.redirect(`/matching/chat/${chat._id}`);

  } catch (error) {
    console.error("Accept match request error:", error);
    res.status(500).render("ERROR");
  }
});

app.get("/matching/request/:requestId/reject", async (req, res) => {
  try {
    const { requestId } = req.params;
    const token = String(req.query.token || "");

    const matchRequest = await MatchRequest.findById(requestId);

    if (!matchRequest || matchRequest.emailToken !== token) {
      return res.status(404).render("ERROR");
    }

    if (matchRequest.status !== "pending") {
      return res.send(`
        <div style="font-family: Arial; max-width: 520px; margin: 80px auto; text-align: center;">
          <h1>This request is already ${matchRequest.status}.</h1>
          <a href="/matching">Back to Matching</a>
        </div>
      `);
    }

    matchRequest.status = "rejected";
    await matchRequest.save();

    res.send(`
      <div style="font-family: Arial; max-width: 520px; margin: 80px auto; text-align: center;">
        <h1>Request rejected</h1>
        <p>You rejected this Study Buddy match request.</p>
        <a href="/matching">Back to Matching</a>
      </div>
    `);

  } catch (error) {
    console.error("Reject match request error:", error);
    res.status(500).render("ERROR");
  }
});


app.post("/api/matching/chat/:chatId/message", requireAuth, async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty."
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long."
      });
    }

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some(participantId => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot send messages here."
      });
    }

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text
    });

    await chat.save();

    res.json({
      success: true,
      message: "Message sent."
    });

  } catch (error) {
    console.error("Send chat message error:", error);

    res.status(500).json({
      success: false,
      message: "Could not send message."
    });
  }
});

app.get("/api/matching/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const requests = await MatchRequest.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedRequests = requests.map(request => {
      const isSender = String(request.sender) === String(userId);

      return {
        _id: request._id,
        status: request.status,
        chat: request.chat,

        direction: isSender ? "sent" : "received",

        otherName: isSender
          ? request.receiverName
          : request.senderName,

        otherEmail: isSender
          ? request.receiverEmail
          : request.senderEmail,

        senderName: request.senderName,
        receiverName: request.receiverName,

        senderWeakSubject: request.senderWeakSubject,
        senderStrongSubject: request.senderStrongSubject,

        createdAt: request.createdAt
      };
    });

    res.json({
      success: true,
      requests: formattedRequests
    });

  } catch (error) {
    console.error("Load match requests error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load match requests."
    });
  }
});

app.post("/api/matching/request/:requestId/cancel", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const matchRequest = await MatchRequest.findOne({
      _id: requestId,
      sender: req.session.user.id
    });

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    if (matchRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled."
      });
    }

    matchRequest.status = "cancelled";
    await matchRequest.save();

    res.json({
      success: true,
      message: "Match request cancelled."
    });

  } catch (error) {
    console.error("Cancel match request error:", error);

    res.status(500).json({
      success: false,
      message: "Could not cancel match request."
    });
  }
});

app.post("/api/matching/profile", requireAuth, async (req, res) => {
  try {
    const rawWeakSubjects = Array.isArray(req.body.weakSubjects)
      ? req.body.weakSubjects
      : [];

    const rawStrongSubjects = Array.isArray(req.body.strongSubjects)
      ? req.body.strongSubjects
      : [];

    const subjectRegex = /^[A-Za-z][A-Za-z\s&+\-#]*$/;

    const invalidSubject = [...rawWeakSubjects, ...rawStrongSubjects]
      .map(subject => String(subject).trim())
      .filter(Boolean)
      .find(subject => !subjectRegex.test(subject));

    if (invalidSubject) {
      return res.status(400).json({
        success: false,
        message: "Subjects must not contain numbers. Use letters only, like Math or Operating Systems."
      });
    }

    const weakSubjects = cleanSubjects(rawWeakSubjects);
    const strongSubjects = cleanSubjects(rawStrongSubjects);

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject or one strong subject."
      });
    }

    const profile = await StudyProfile.findOneAndUpdate(
      {
        user: req.session.user.id
      },
      {
        user: req.session.user.id,
        fullName: req.session.user.fullName,
        username: req.session.user.username,
        email: req.session.user.email,
        university: req.session.user.university || "",
        major: req.session.user.major || "",
        weakSubjects,
        strongSubjects
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error("Save matching profile error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save your study list."
    });
  }
});

app.get("/matching", (req, res) => {
  res.render("matching");
});

app.get("/admin", requireAdminPage, (req, res) => {
  res.render("admin");
});

app.get("/ai", (req, res) => {
  res.render("ai");
});

app.get("/edugate", async (req, res) => {
  try {
    const universities = await University.find().sort({ createdAt: 1 });

    res.render("edugate", {
      universities
    });
  } catch (error) {
    console.error("Edugate page error:", error);

    res.render("edugate", {
      universities: []
    });
  }
});

app.get("/resources", async (req, res) => {
  try {
    const categories = await ResourceCategory.find()
      .sort({ createdAt: 1 })
      .lean();

    res.render("resources", {
      categories
    });

  } catch (error) {
    console.error("Resources page error:", error);

    res.render("resources", {
      categories: []
    });
  }
});
app.get("/academic-atlas", async (req, res) => {
  try {
    const categories = await ResourceCategory.find()
      .sort({ createdAt: 1 })
      .lean();

    res.render("academic-atlas", {
      categories
    });

  } catch (error) {
    console.error("Academic Atlas error:", error);

    res.render("academic-atlas", {
      categories: []
    });
  }
});

app.get("/cylinder", (req, res) => {
  res.render("cylinder");
});


app.get("/events", async (req, res) => {
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

app.post("/api/ai", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Write a message first."
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is missing. Add GEMINI_API_KEY to your .env file, then restart the server."
      });
    }

    const ai = await getGeminiAI();

    if (!ai) {
      return res.status(500).json({
        error: "Gemini AI could not start."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && typeof item.role === "string" && typeof item.text === "string")
          .slice(-10)
      : [];

    const contents = [];

    for (const item of safeHistory) {
      contents.push({
        role: item.role === "model" ? "model" : "user",
        parts: [
          {
            text: item.text.slice(0, 4000)
          }
        ]
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: message.trim().slice(0, 8000)
        }
      ]
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: ANSWER_STYLE,
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    });

    const reply = response.text?.trim();

    if (!reply) {
      return res.status(500).json({
        error: "Gemini returned an empty response. Try again."
      });
    }

    res.json({
      reply
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    const rawMessage = error?.message || "Gemini failed.";

    if (rawMessage.includes("PERMISSION_DENIED") || rawMessage.includes("403")) {
      return res.status(403).json({
        error: "Gemini rejected this API key/project. Create a new key from Google AI Studio, put it in .env, then restart the server."
      });
    }

    if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("API key not valid")) {
      return res.status(401).json({
        error: "Your Gemini API key is invalid. Create a new key and put it in .env."
      });
    }

    res.status(500).json({
      error: rawMessage
    });
  }
});

app.get("/api/events/registration-status", requireAuth, async (req, res) => {
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

app.get("/api/events/bracket", requireAuth, async (req, res) => {
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

app.post("/events/register", requireAuth, async (req, res) => {
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

    if (players.length > maxPlayers) {
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

app.get("/leaderboard", async (req, res) => {
  try {
    const scores = await GameScore.find()
      .sort({ score: -1 })
      .limit(20)
      .lean();

    res.json(
      scores.map(score => ({
        name: score.name,
        score: score.score
      }))
    );
  } catch (error) {
    console.error("Leaderboard load error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load leaderboard."
    });
  }
});

app.post("/leaderboard", requireAuth, async (req, res) => {
  try {
    const score = Number(req.body.score);

    if (!Number.isFinite(score)) {
      return res.status(400).json({
        success: false,
        message: "Score is required."
      });
    }

    if (!Number.isInteger(score)) {
      return res.status(400).json({
        success: false,
        message: "Score must be a whole number."
      });
    }

    if (score < 0) {
      return res.status(400).json({
        success: false,
        message: "Score cannot be negative."
      });
    }

    if (score > 1000000) {
      return res.status(400).json({
        success: false,
        message: "Score is too high."
      });
    }

    const playerName =
      req.session.user.fullName ||
      req.session.user.username ||
      "Player";

    await GameScore.findOneAndUpdate(
      {
        user: req.session.user.id
      },
      {
        $max: {
          score
        },
        $set: {
          user: req.session.user.id,
          name: playerName
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: "Score saved."
    });

  } catch (error) {
    console.error("Leaderboard save error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save score."
    });
  }
});

app.delete("/admin/users/:userId", requireAdminApi, async (req, res) => {  try {
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

app.get("/game-landing-page", (req, res) => {
  res.render("game-landing-page");
});

// Safety redirects for old/wrong links
app.get("/game", (req, res) => {
  res.redirect("/blockblast");
});

app.get("/Game2", (req, res) => {
  res.redirect("/wordle");
});

app.get("/blockblast", requirePageAuth, (req, res) => {
  res.render("game");
});

app.get("/wordle", requirePageAuth, (req, res) => {
  res.render("Game2");
});


const PORT = process.env.PORT || 5000;

app.get("/freshman-guid", (req, res) => {
  res.render("freshman-guid");
});

app.get("/matching/chat/:chatId", requirePageAuth, async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return res.status(404).render("ERROR");
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(404).render("ERROR");
    }

    const otherUserId = (chat.participants || []).find((participantId) => {
      return String(participantId) !== String(req.session.user.id);
    });

    let otherUser = null;

    if (otherUserId) {
      otherUser = await User.findById(otherUserId)
        .select("fullName username email")
        .lean();
    }

    return res.render("matching-chat", {
      chatId: chatId,
      otherUser: otherUser || null
    });

  } catch (error) {
    console.error("Chat page error:", error);
    return res.status(500).render("ERROR");
  }
});


app.get("/api/matching/chat/:chatId/messages", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some(participantId => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this chat."
      });
    }

   const matchRequest = await MatchRequest.findById(chat.matchRequest).lean();

res.json({
  success: true,
  messages: chat.messages || [],
  currentUserId: String(req.session.user.id),
  request: matchRequest
    ? {
        _id: matchRequest._id,
        status: matchRequest.status,
        scheduledAt: matchRequest.scheduledAt,
        emailSentAt: matchRequest.emailSentAt,
        meetingLink: matchRequest.meetingLink,
        roomId: matchRequest.roomId
      }
    : null
});

  } catch (error) {
    console.error("Load chat messages error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load chat messages."
    });
  }
});

app.patch("/api/matching/chat/:chatId/schedule", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "Choose a meeting date and time."
      });
    }

    const finalScheduledAt = new Date(scheduledAt);

    if (Number.isNaN(finalScheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date and time."
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot schedule this match."
      });
    }

    const matchRequest = await MatchRequest.findById(chat.matchRequest);

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    matchRequest.status = "rescheduled";
    matchRequest.scheduledAt = finalScheduledAt;
    matchRequest.emailSentAt = null;
    matchRequest.roomId = "";
    matchRequest.meetingLink = "";

    await matchRequest.save();

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text: `Scheduled the match for ${formatMatchSchedule(finalScheduledAt)}.`
    });

    await chat.save();

    if (finalScheduledAt.getTime() <= Date.now()) {
      await sendChatMatchEmail(matchRequest);

      return res.json({
        success: true,
        message: "Selected time is now/past, so the meeting email was sent now to both students."
      });
    }

    return res.json({
      success: true,
      message: `Meeting scheduled. The email will be sent to both students at ${formatMatchSchedule(finalScheduledAt)}.`
    });

  } catch (error) {
    console.error("Schedule chat match error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not schedule the match."
    });
  }
});

app.post("/api/matching/chat/:chatId/match-now", requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot start this match."
      });
    }

    const matchRequest = await MatchRequest.findById(chat.matchRequest);

    if (!matchRequest) {
      return res.status(404).json({
        success: false,
        message: "Match request was not found."
      });
    }

    matchRequest.scheduledAt = new Date();

    const result = await sendChatMatchEmail(matchRequest);

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text: result.alreadySent
        ? "The meeting link was already sent before."
        : "Started the match now. The meeting email was sent to both students."
    });

    await chat.save();

    return res.json({
      success: true,
      message: result.alreadySent
        ? "Meeting email was already sent before."
        : "Match started now. Meeting email sent to both students."
    });

  } catch (error) {
    console.error("Match now error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Could not start the match now."
    });
  }
});

app.post("/api/matching/chat/:chatId/message", requireAuth, async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty."
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long."
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat was not found."
      });
    }

    const isParticipant = (chat.participants || []).some((participantId) => {
      return String(participantId) === String(req.session.user.id);
    });

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You cannot send messages in this chat."
      });
    }

    chat.messages.push({
      sender: req.session.user.id,
      senderName: req.session.user.fullName || req.session.user.username || "Student",
      text: text
    });

    await chat.save();

    return res.json({
      success: true,
      message: "Message sent."
    });

  } catch (error) {
    console.error("Send chat message error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not send message."
    });
  }
});

app.get("/cylinder/admin", (req, res) => {
  return res.status(403).render("UNAUTHORIZED");
});

app.use((req, res) => {
  res.status(404).render("ERROR");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
