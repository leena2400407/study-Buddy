const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
require("dotenv").config();

const app = express();

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

app.get("/signup", (req, res) => {
  res.render("signup");
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