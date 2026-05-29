const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const connectDB = require("./config/db");
const User = require("./models/User");
const StudyProfile = require("./models/StudyProfile");
const GameScore = require("./models/GameScore");
const Event = require("./models/Events");
const EventRegistration = require("./models/eventsReg");
const University = require("./models/Universities");
const { requireAuth, requirePageAuth } = require("./middleware/authMiddleware");
require("dotenv").config();

const app = express();

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

// EJS global variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

const requireAdminPage = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Please login first.");
    return res.redirect("/login?returnTo=/admin");
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
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

    res.json({
      success: true,
      overview: {
        usersCount,
        studyProfilesCount,
        eventRegistrationsCount,
        gameScoresCount,
        eventsCount,
        universitiesCount
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

app.get("/admin/api/users", requireAdminApi, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load users."
    });
  }
});

app.get("/admin/api/study-profiles", requireAdminApi, async (req, res) => {
  try {
    const profiles = await StudyProfile.find()
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      profiles
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
    const registrations = await EventRegistration.find()
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      registrations
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
    const scores = await GameScore.find()
      .sort({ score: -1 })
      .lean();

    res.json({
      success: true,
      scores
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
    const events = await Event.find()
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      events
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
    const universities = await University.find()
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      universities
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


const cleanSubjects = (subjects) => {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return [...new Set(
    subjects
      .map(subject => String(subject).trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .map(subject =>
        subject
          .toLowerCase()
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      )
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

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      req.flash("error", "Invalid username or password.");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);

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

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
    console.log("Signup request received");
    console.log("req.body");
  try {
    const {
      fullName,
      username,
      gender,
      university,
      major,
      email,
      password,
      confirmPassword
    } = req.body;

    if (
      !fullName ||
      !username ||
      !gender ||
      !university ||
      !major ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      req.flash("error", "Please fill in all fields.");
      return res.redirect("/signup");
    }

    const allowedUniversityDomains = [
        "miuegypt.edu.eg",
        "giu-uni.de",
        "ecu.edu.eg",
        "cis.asu.edu.eg",
        "student.guc.edu.eg",    
    ];
    const emailDomain = email.split("@")[1]?.toLowerCase();

    if (!emailDomain || !allowedUniversityDomains.includes(emailDomain)) {
        req.flash("error", "Please use your official university email.");
        return res.redirect("/signup");
    }

    if (password.length < 8) {
      req.flash("error", "Password must be at least 8 characters.");
      return res.redirect("/signup");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("/signup");
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      req.flash("error", "Email or username already exists.");
      return res.redirect("/signup");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullName,
      username,
      gender,
      university,
      major,
      email,
      password: hashedPassword
    });
    await sendSignupEmail(email, fullName);

    req.flash("success", "Account created successfully. Please log in.");
    res.redirect("/login");
  } catch (error) {
    console.error("Signup error:", error);
    req.flash("error", "Something went wrong.");
    res.redirect("/signup");
  }
});

app.get("/mainpage", (req, res) => {
  res.render("index");
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

    const {
      fullName,
      username,
      gender,
      university,
      major
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        fullName,
        username,
        gender,
        university,
        major
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

    const weakSubjects = req.body.weakSubjects
      ? req.body.weakSubjects
          .split(",")
          .map(subject => subject.trim())
          .filter(Boolean)
      : [];

    const strongSubjects = req.body.strongSubjects
      ? req.body.strongSubjects
          .split(",")
          .map(subject => subject.trim())
          .filter(Boolean)
      : [];

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

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
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

app.post("/api/matching/profile", requireAuth, async (req, res) => {
  try {
    const weakSubjects = cleanSubjects(req.body.weakSubjects);
    const strongSubjects = cleanSubjects(req.body.strongSubjects);

    if (weakSubjects.length === 0 && strongSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one weak subject or one strong subject."
      });
    }

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

    res.json({
      success: true,
      message: "Study list cleared.",
      profile
    });

  } catch (error) {
    console.error("Clear study profile error:", error);

    res.status(500).json({
      success: false,
      message: "Could not clear your study list."
    });
  }
});


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

 app.get("/freshman-guide", (req, res) => {
      res.render("freshman-guid");
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

app.get("/resources", (req, res) => {
  res.render("resources");
});

app.get("/game", requirePageAuth, (req, res) => {
  res.render("game");
});

app.get("/game2", (req, res) => {
  res.render("game2");
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
        message: "Please fill in team name and player details."
      });
    }

    const eventData = await Event.findOne({ title: tournamentName });

    if (!eventData) {
      return res.status(404).json({
        success: false,
        message: "Event was not found."
      });
    }

    const maxPlayers = Number(eventData.maxPlayers) || 10;

    const cleanedPlayers = players
      .map(player => ({
        name: String(player.name || "").trim(),
        email: String(player.email || "").trim().toLowerCase()
      }))
      .filter(player => player.name && player.email);

    if (cleanedPlayers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one valid player."
      });
    }

    if (cleanedPlayers.length > maxPlayers) {
      return res.status(400).json({
        success: false,
        message: `This tournament allows maximum ${maxPlayers} players.`
      });
    }

    await EventRegistration.create({
      user: req.session.user.id,
      fullName: req.session.user.fullName || "Unknown User",
      email: req.session.user.email || "unknown@email.com",
      university: req.session.user.university || "Unknown University",
      tournamentName,
      teamName,
      players: cleanedPlayers
    });

    try {
      await sendEventRegistrationEmail({
        to: req.session.user.email,
        leaderName: req.session.user.fullName || req.session.user.username || cleanedPlayers[0].name,
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
      message: "Tournament registration completed successfully. Confirmation email sent."
    });

  } catch (error) {
    console.error("Event registration error:", error);

    res.status(500).json({
      success: false,
      message: "Could not complete registration."
    });
  }
});

app.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    id: req.session.user.id,
    name: req.session.user.fullName || req.session.user.username || "Player",
    username: req.session.user.username,
    email: req.session.user.email
  });
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

    if (Number.isNaN(score)) {
      return res.status(400).json({
        success: false,
        message: "Score is required."
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
          score: score
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

// Old game routes
app.get("/game", requirePageAuth, (req, res) => {
  res.render("game");
});

app.get("/game2", (req, res) => {
  res.render("game2");
});

// New cleaner game URLs
app.get("/blockblast", requirePageAuth, (req, res) => {
  res.render("game");
});

app.get("/wordle", requirePageAuth, (req, res) => {
  res.render("game2");
});


// Server start
const PORT = process.env.PORT || 5000;

app.get("/freshman-guid", (req, res) => {
  res.render("freshman-guid");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

