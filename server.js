const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
require("dotenv").config();

const app = express();

connectDB();

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

    await User.create({
      fullName,
      username,
      gender,
      university,
      major,
      email,
      password: hashedPassword
    });

    req.flash("success", "Account created successfully. Please log in.");
    res.redirect("/login");
  } catch (error) {
    console.error("Signup error:", error);
    req.flash("error", "Something went wrong.");
    res.redirect("/signup");
  }
});

app.get("/mainpage", (req, res) => {
  res.render("mainpage");
});

app.get("/profile", (req, res) => {
  res.render("profile");
});

app.get("/events", (req, res) => {
  res.render("events");
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