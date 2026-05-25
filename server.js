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
require("dotenv").config();

const app = express();

connectDB();

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

const sendMatchRoomEmail = async ({ to, receiverName, senderName, matchedName, roomId, meetingLink }) => {
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

          <p>
            <strong>Room ID:</strong><br>
            ${roomId}
          </p>

          <p>
            <strong>Video Room Link:</strong><br>
            <a href="${meetingLink}" target="_blank" style="color: #2563eb;">
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
  eventCategory
}) => {
  const transporter = createEmailTransporter();

  const locationLink = "https://maps.app.goo.gl/1Eayp67KpPmGmCGw7?g_st=iw";

  const cleanedCategory = String(eventCategory || "").toLowerCase();

  const eventType =
    cleanedCategory.includes("padel")
      ? "Padel Tournament"
      : cleanedCategory.includes("football") || cleanedCategory.includes("sports")
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
            ${eventDescription}
            <br>
            <b>the event will take place at zone D in the wafaa and ELAMAL</b>
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

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first."
    });
  }

  next();
};

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

app.get("/login", (req, res) => {
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
      gender: user.gender
    };

    res.redirect("/mainpage");
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

app.get("/profile", (req, res) => {
  res.render("profile");
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
        let reason = "";

        if (canTeachMe.length > 0) {
          score += canTeachMe.length * 70;
          reason += `${profile.fullName} can help you with ${canTeachMe.join(", ")}. `;
        }

        if (iCanTeachThem.length > 0) {
          score += iCanTeachThem.length * 30;
          reason += `You can help ${profile.fullName} with ${iCanTeachThem.join(", ")}. `;
        }

        reason += `Same university and major: ${profile.university} - ${profile.major}.`;

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
          score,
          reason: reason.trim()
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
      meetingLink
    });

    await sendMatchRoomEmail({
      to: matchedProfile.email,
      receiverName: matchedProfile.fullName,
      senderName: myProfile.fullName,
      matchedName: matchedProfile.fullName,
      roomId,
      meetingLink
    });

    app.get("/freshman-guide", (req, res) => {
      res.render("freshman-guid");
    });

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

app.get("/admin", (req, res) => {
  res.render("admin");
});

app.get("/ai", (req, res) => {
  res.render("ai");
});

app.get("/edugate", (req, res) => {
  res.render("edugate");
});

app.get("/resources", (req, res) => {
  res.render("resources");
});

app.get("/game", (req, res) => {
  if (!req.session.user) {
    req.flash("error", "Please login first to play the game.");
    return res.redirect("/login");
  }

  res.render("game");
});

app.get("/game2", (req, res) => {
  res.render("game2");
});

app.get("/cylinder", (req, res) => {
  res.render("cyinder");
});

app.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });

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

app.get("/seed-events", async (req, res) => {
  try {
    await Event.deleteMany({});

    await Event.insertMany([
      {
        title: "University Football Cup 2026",
        category: "sports",
        description: "Team registration, competitive bracket, and prize pool.",
        imagePath: "/assests/images/football.avif",
        buttonType: "register",
        maxPlayers: 10
      },
      {
        title: "University Padel Cup 2026",
        category: "padel",
        description: "Fast matches, student teams, and court vibes.",
        imagePath: "/assests/images/padel.jpg",
        buttonType: "register",
        maxPlayers: 2
      },
      {
        title: "Disco Misr X Reiki Beach",
        category: "music",
        description: "Entertainment night with premium ticket flow.",
        imagePath: "/assests/images/disco msar.png",
        buttonType: "details",
        detailsLink: "https://tazkarti.com/#/events/category/96",
        maxPlayers: 0
      },
      {
        title: "Cairokee Empire Stadium",
        category: "concert",
        description: "Big stadium energy for campus friends.",
        imagePath: "/assests/images/cairokee.jpg",
        buttonType: "details",
        detailsLink: "https://tazkarti.com/#/events/category/96",
        maxPlayers: 0
      },
      {
        title: "Amr Diab AUC",
        category: "concert",
        description: "Premium night, premium cards, no broken images.",
        imagePath: "/assests/images/amr diab.jpeg",
        buttonType: "details",
        detailsLink: "https://tazkarti.com/#/events/category/96",
        maxPlayers: 0
      }
    ]);

    res.send("Events added successfully.");
  } catch (error) {
    console.error("Seed events error:", error);
    res.status(500).send("Could not seed events.");
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
        eventCategory: eventData.category
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

// Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

