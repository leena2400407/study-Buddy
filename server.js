const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const connectDB = require("./config/db");
const User = require("./models/User");
const StudyProfile = require("./models/StudyProfile");
require("dotenv").config();

const app = express();

connectDB();

const sendSignupEmail = async (userEmail, fullName) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

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
    saveUninitialized: false
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

const hasCommonSubject = (firstList, secondList) => {
  return firstList.some(firstSubject =>
    secondList.some(secondSubject =>
      firstSubject.toLowerCase() === secondSubject.toLowerCase()
    )
  );
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

    console.log("Signup body received:", req.body);

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

    const newUser = await User.create({
      fullName,
      username,
      gender,
      university,
      major,
      email,
      password: hashedPassword
    });

    console.log("User saved successfully:", newUser._id);

    try {
      await sendSignupEmail(email, fullName);
      console.log("Signup email sent successfully.");
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

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

app.get("/events", (req, res) => {
  res.render("events");
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

    const allProfiles = await StudyProfile.find({
      user: {
        $ne: req.session.user.id
      }
    }).lean();

    const matches = allProfiles
      .map(profile => {
        const otherWeakSubjects = profile.weakSubjects || [];
        const otherStrongSubjects = profile.strongSubjects || [];

        const sameWeakSubjects = getCommonSubjects(myWeakSubjects, otherWeakSubjects);

        if (sameWeakSubjects.length > 0) {
          return null;
        }

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
          reason += `You can help ${profile.fullName} with ${iCanTeachThem.join(", ")}.`;
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
  res.render("game");
});

app.get("/game2", (req, res) => {
  res.render("game2");
});

app.get("/cylinder", (req, res) => {
  res.render("cyinder");
});

// Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});