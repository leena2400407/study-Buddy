const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const User = require("../models/user");
const Avatar = require("../models/Avatar");
const sendEmail = require("../utils/sendEmail");

const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${process.env.PORT || 8080}`);

router.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: process.env.MAIL_TEST_TO,
      subject: "Study Buddy Railway Email Test",
      html: `
        <h2>Email works from Railway</h2>
        <p>BASE_URL is: ${BASE_URL}</p>
        <p>Test link:</p>
        <a href="${BASE_URL}">${BASE_URL}</a>
      `,
      text: `Email works from Railway. BASE_URL: ${BASE_URL}`
    });

    res.send("Email sent successfully from Railway");
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    res.status(500).send("Email failed: " + err.message);
  }
});


const sendSignupEmail = async (userEmail, fullName) => {
  await sendEmail({
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
    `,
    text: `Hello ${fullName}, thank you for signing up to Study Buddy.`
  });

  console.log("Signup email sent successfully to:", userEmail);
};


const sendPasswordResetLinkEmail = async (userEmail, fullName, resetLink) => {
  await sendEmail({
    to: userEmail,
    subject: "Reset your Study Buddy password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset</h2>
        <p>Hello ${fullName},</p>
        <p>Click the link below to reset your password:</p>
        <p>
          <a href="${resetLink}" target="_blank">${resetLink}</a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <br>
        <p><strong>Study Buddy Team</strong></p>
      </div>
    `,
    text: `Hello ${fullName}, reset your password here: ${resetLink}`
  });
};


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again later."
});


router.get("/login", (req, res) => {
  if (req.query.returnTo && req.query.returnTo.startsWith("/")) {
    req.session.returnTo = req.query.returnTo;
  }

  res.render("login");
});

router.post("/login", authLimiter,async (req, res) => {
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

router.get("/signup", async (req, res) => {
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

router.post("/signup", authLimiter, async (req, res) => {
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
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password", {
    error: [],
    success: []
  });
});

router.get("/forget-password", (req, res) => {
  res.redirect("/forgot-password");
});

router.post("/forgot-password", authLimiter, async (req, res) => {
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

    const resetLink = `${BASE_URL}/reset-password/${token}`;

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

router.get("/reset-password/:token", (req, res) => {
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

router.post("/reset-password/:token", authLimiter, async (req, res) => {
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


router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

module.exports = router;
