require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const helmet = require("helmet");

const connectDB = require("./config/db");
const languageMiddleware = require("./middleware/language");

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/css", express.static(path.join(__dirname, "Public", "css")));
app.use("/javaScript", express.static(path.join(__dirname, "Public", "javaScript")));
app.use("/assests", express.static(path.join(__dirname, "Public", "assests")));
app.use("/uploads/avatars", express.static(path.join(__dirname, "Public", "uploads", "avatars")));

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
app.use(languageMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", require("./routes/pageRoutes"));
app.use("/", require("./routes/authRoutes"));
app.use("/", require("./routes/profileRoutes"));
app.use("/", require("./routes/adminRoutes"));
app.use("/", require("./routes/matchingRoutes"));
app.use("/", require("./routes/eventsRoutes"));
app.use("/", require("./routes/gameRoutes"));
app.use("/", require("./routes/aiRoutes"));

app.use((req, res) => {
  res.status(404).render("ERROR");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
