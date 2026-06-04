const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const User = require("./models/User");
const StudyProfile = require("./models/StudyProfile");
const GameScore = require("./models/GameScore");
const Event = require("./models/Events");
const EventRegistration = require("./models/eventsReg");
const University = require("./models/Universities");
const { requireAuth, requirePageAuth } = require("./middleware/authMiddleware");
const ResourceCategory = require("./models/resources");
require("dotenv").config();

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

connectDB();

const matchCooldowns = new Map();
const MATCH_COOLDOWN_MS = 8 * 60 * 1000;

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

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendSignupEmail = async (userEmail, fullName) => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${process.env.EMAIL_USER}>`,
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
};

const sendMatchRoomEmail = async ({ to, receiverName, senderName, matchedName, roomId, meetingLink, helpSubjects }) => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: `Study Buddy <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your Study Buddy Video Room",
    html: `

      <div style="margin-top: 22px; background: #fff1f2; padding: 24px; border-radius: 14px; border: 1px solid #fecdd3;">
          <h2 style="margin-top: 0; color: #991b1b;">Study Room Rules</h2>

          <div style="background: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #fecdd3;">
            <strong style="color: #b91c1c;">01</strong>
            <p style="margin: 6px 0 0;">We only connect people for studying purposes.</p>
          </div>

          <div style="background: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #fecdd3;">
            <strong style="color: #b91c1c;">02</strong>
            <p style="margin: 6px 0 0;">Respect your colleagues in the meet.</p>
          </div>

          <div style="background: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #fecdd3;">
            <strong style="color: #b91c1c;">03</strong>
            <p style="margin: 6px 0 0;">
              If you joined the call and no one entered after 5 minutes, you have the right to leave the meet.
            </p>
          </div>

          <div style="background: white; padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #fecdd3;">
            <strong style="color: #b91c1c;">04</strong>
            <p style="margin: 6px 0 0;">
              You must be logged in to the website for the meet to start.
            </p>
          </div>

          <div style="background: white; padding: 14px 16px; border-radius: 10px; border: 1px solid #fecdd3;">
            <strong style="color: #b91c1c;">05</strong>
            <p style="margin: 6px 0 0;">
              You must enter using a laptop.
            </p>
          </div>

        </div>

      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 650px; margin: auto; padding: 20px;">
        <div style="background: #f7f9fc; padding: 24px; border-radius: 14px; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0; color: #1f2937;">Your Study Buddy Room is Ready</h2>

          <p>Hello ${receiverName},</p>

          <p>
            A study match has been created between
            <strong>${senderName}</strong> and <strong>${matchedName}</strong>.
          </p>

        <div style="margin: 18px 0; padding: 16px; border-radius: 12px; background: #eef2ff; border: 1px solid #c7d2fe;">
          <p style="margin: 0; color: #1e1b4b; font-size: 15px; line-height: 1.6;">
            <strong>Helping with:</strong><br>
            ${helpSubjects && helpSubjects.length > 0 ? helpSubjects.join(", ") : "General study support"}
          </p>
      </div>

          <p>
          <strong>Room ID:</strong><br>
          ${roomId}
          </p>

          <p>
            <strong>Video Room Link:</strong><br>
            <a href="${meetingLink}" target="_blank" style="color: #2563eb; word-break: break-all;">
            ${meetingLink}
            </a>
          </p>

          <p>
            Click the link above to join the meeting.
          </p>
        </div>

        <p style="margin-top: 22px;">
          Best regards,<br>
          <strong>Study Buddy Team</strong>
        </p>
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
    from: `Study Buddy <${process.env.EMAIL_USER}>`,
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
app.use(express.static(path.join(__dirname, "Public")));

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
    return res.status(404).render("ERROR");
  }

  if (req.session.user.role !== "admin") {
    return res.status(404).render("ERROR");
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

    res.json({
      success: true,
      overview: {
        usersCount,
        studyProfilesCount,
        eventRegistrationsCount,
        gameScoresCount,
        eventsCount,
        universitiesCount,
        resourcesCount
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
    const fullNameRegex = /^[A-Za-z]+[0-9]*$/;

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

const getCommonSubjects = (firstList, secondList) => {
  return firstList.filter(firstSubject =>
    secondList.some(secondSubject =>
      firstSubject.toLowerCase() === secondSubject.toLowerCase()
    )
  );
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

function renderSignupError(res, message, oldInput) {
  return res.status(400).render("signup", {
    error: [message],
    success: [],
    oldInput
  });
}

app.get("/signup", (req, res) => {
  res.render("signup", {
    oldInput: {},
    error: [],
    success: []
  });
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
      confirmPassword
    } = req.body;

    const cleanedFullName = String(fullName || "").trim().replace(/\s+/g, " ");
    const cleanedUsername = String(username || "").trim();
    const cleanedGenderRaw = String(gender || "").trim().toLowerCase();
    const cleanedUniversity = String(university || "").trim();
    const cleanedMajor = String(major || "").trim();
    const cleanedEmail = String(email || "").trim().toLowerCase();
    const cleanedPassword = String(password || "");
    const cleanedConfirmPassword = String(confirmPassword || "");

    const oldInput = {
      fullName: cleanedFullName,
      username: cleanedUsername,
      gender: cleanedGenderRaw,
      university: cleanedUniversity,
      major: cleanedMajor,
      email: cleanedEmail
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

    const allowedUniversityDomains = [
      "miuegypt.edu.eg",
      "giu-uni.de",
      "ecu.edu.eg",
      "cis.asu.edu.eg",
      "student.guc.edu.eg"
    ];

    const emailDomain = cleanedEmail.split("@")[1];

    if (!emailDomain || !allowedUniversityDomains.includes(emailDomain)) {
      return renderSignupError(
        res,
        "Please use your official university email.",
        oldInput
      );
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

    const hashedPassword = await bcrypt.hash(cleanedPassword, 10);

    await User.create({
      fullName: cleanedFullName,
      username: cleanedUsername,
      gender: finalGender,
      university: cleanedUniversity,
      major: cleanedMajor,
      email: cleanedEmail,
      password: hashedPassword,
      role: "student"
    });

    await sendSignupEmail(cleanedEmail, cleanedFullName);

    req.flash("success", "Account created successfully. Please log in.");
    res.redirect("/login");

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

    const weakSubjects = cleanSubjects(
      String(req.body.weakSubjects || "")
        .split(",")
    );

    const strongSubjects = cleanSubjects(
      String(req.body.strongSubjects || "")
        .split(",")
    );

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      req.flash("error", "Add at least one weak subject or one strong subject.");
      return res.redirect("/profile#study");
    }

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

app.get("/api/matching/matches", requireAuth, async (req, res) => {
  try {
    const myProfile = await StudyProfile.findOne({
      user: req.session.user.id
    });

    if (!myProfile) {
      return res.status(400).json({
        success: false,
        message: "Build and save your list first."
      });
    }

    const myWeakSubjects = myProfile.weakSubjects || [];
    const myStrongSubjects = myProfile.strongSubjects || [];

    if (myWeakSubjects.length === 0 && myStrongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject or one strong subject."
      });
    }

    if (!myProfile.university || !myProfile.major) {
      return res.status(400).json({
        success: false,
        message: "Your profile is missing university or major. Please save your study list again."
      });
    }

    const allProfiles = await StudyProfile.find({
      user: {
        $ne: req.session.user.id
      },
      university: myProfile.university,
      major: myProfile.major
    }).lean();

   const matches = allProfiles
      .map(profile => {
        const otherWeakSubjects = profile.weakSubjects || [];
        const otherStrongSubjects = profile.strongSubjects || [];

        const canTeachMe = getCommonSubjects(myWeakSubjects, otherStrongSubjects);
        const iCanTeachThem = getCommonSubjects(myStrongSubjects, otherWeakSubjects);

        if (canTeachMe.length === 0 && iCanTeachThem.length === 0) {
          return null;
        }
        let score = 0;

        if (canTeachMe.length > 0) {
        score += canTeachMe.length * 70;
          }

          if (iCanTeachThem.length > 0) {
          score += iCanTeachThem.length * 30;
          }

          if (score > 100) {
          score = 100;
            }

        return {
          _id: profile._id,
          user: profile.user,
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email,
          university: profile.university,
          major: profile.major,
          weakSubjects: otherWeakSubjects,
          strongSubjects: otherStrongSubjects,
          canTeachMe,
          iCanTeachThem,
          score
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.canTeachMe.length !== a.canTeachMe.length) {
          return b.canTeachMe.length - a.canTeachMe.length;
        }

        return b.score - a.score;
      });

    res.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error("Get matches error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load matches."
    });
  }
});

app.post("/api/matching/send-room", requireAuth, async (req, res) => {

  try {
    const { matchedProfileId } = req.body;

    const userId = String(req.session.user.id);
    const lastMatchTime = matchCooldowns.get(userId);
    const now = Date.now();

    if (lastMatchTime && now - lastMatchTime < MATCH_COOLDOWN_MS) {
      const remainingMs = MATCH_COOLDOWN_MS - (now - lastMatchTime);
      const remainingMinutes = Math.ceil(remainingMs / 60000);

    return res.status(429).json({
      success: false,
      message: `Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before creating another match room.`
    });
  }

    if (!matchedProfileId) {
      return res.status(400).json({
        success: false,
        message: "Matched student was not selected."
      });
    }

    const myProfile = await StudyProfile.findOne({
      user: req.session.user.id
    });

    if (!myProfile) {
      return res.status(400).json({
        success: false,
        message: "Build and save your list first."
      });
    }

    const matchedProfile = await StudyProfile.findById(matchedProfileId);

    if (!matchedProfile) {
      return res.status(404).json({
        success: false,
        message: "Matched student was not found."
      });
    }

    if (String(matchedProfile.user) === String(req.session.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot match with yourself."
      });
    }

    if (
      myProfile.university !== matchedProfile.university ||
      myProfile.major !== matchedProfile.major
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only match with students from your same university and major."
      });
    }

    const myWeakSubjects = myProfile.weakSubjects || [];
    const myStrongSubjects = myProfile.strongSubjects || [];
    const otherWeakSubjects = matchedProfile.weakSubjects || [];
    const otherStrongSubjects = matchedProfile.strongSubjects || [];

    const canTeachMe = getCommonSubjects(myWeakSubjects, otherStrongSubjects);
    const iCanTeachThem = getCommonSubjects(myStrongSubjects, otherWeakSubjects);

    if (canTeachMe.length === 0 && iCanTeachThem.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This student is not a valid match anymore."
      });
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const roomId = `studybuddy-${Date.now()}-${randomCode}`;

    const jitsiConfig =
      "#config.startWithVideoMuted=true" +
      "&config.startWithAudioMuted=true" +
      "&config.toolbarButtons=%5B%22microphone%22%2C%22chat%22%2C%22participants-pane%22%2C%22tileview%22%2C%22hangup%22%5D";

    const meetingLink = `https://meet.jit.si/${roomId}${jitsiConfig}`;

    await sendMatchRoomEmail({
      to: myProfile.email,
      receiverName: myProfile.fullName,
      senderName: myProfile.fullName,
      matchedName: matchedProfile.fullName,
      roomId,
      meetingLink,
      helpSubjects: canTeachMe
    });

    await sendMatchRoomEmail({
      to: matchedProfile.email,
      receiverName: matchedProfile.fullName,
      senderName: myProfile.fullName,
      matchedName: matchedProfile.fullName,
      roomId,
      meetingLink,
      helpSubjects: canTeachMe
    });

    matchCooldowns.set(userId, Date.now());

    res.json({
      success: true,
      message: `Video room sent to you and ${matchedProfile.fullName}.`,
      roomId,
      meetingLink
    });
  } catch (error) {
    console.error("Send matching room error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create or send the video room."
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

app.post("/events/register", requireAuth, async (req, res) => {
  try {
    const { tournamentName, teamName, players } = req.body;

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
    });

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: "You already registered for this tournament."
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

    const captainName = String(captain?.name || "").trim();
    const captainEmail = String(captain?.email || "").trim().toLowerCase();

    if (!captainName || !captainEmail) {
      return res.status(400).json({
        success: false,
        message: "Captain name and email are required."
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
        const playerName = String(player.name || "").trim();

        if (!playerName) return null;

        return {
          role: index === 0 ? "captain" : "player",
          name: playerName,
          email: index === 0 ? captainEmail : ""
        };
      })
      .filter(Boolean);

    if (cleanedPlayers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please add at least the captain."
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
      message: "Tournament registration completed successfully. Confirmation email sent to the captain."
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

app.get("/blockblast", requirePageAuth, (req, res) => {
  res.render("game");
});

app.get("/wordle", requirePageAuth, (req, res) => {
  res.render("Game2");
});


// Server start
const PORT = process.env.PORT || 5000;

app.get("/freshman-guid", (req, res) => {
  res.render("freshman-guid");
});

app.use((req, res) => {
  res.status(404).render("ERROR");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
