const express = require("express");
const router = express.Router();

const University = require("../models/Universities");
const ResourceCategory = require("../models/resources");

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/index", (req, res) => {
  res.render("index");
});

router.get("/mainpage", (req, res) => {
  res.render("index");
});

router.get("/change-language/:lang", (req, res) => {
  const selectedLanguage = String(req.params.lang || "").trim().toLowerCase();

  if (["en", "ar"].includes(selectedLanguage)) {
    req.session.language = selectedLanguage;
  }

  const redirectTo = String(req.query.redirect || req.get("referer") || "/cylinder");

  req.session.save(() => {
    res.redirect(redirectTo);
  });
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

router.get("/matching", (req, res) => {
  res.render("matching");
});

router.get("/admin", requireAdminPage, (req, res) => {
  res.render("admin");
});

router.get("/ai", (req, res) => {
  res.render("ai");
});

router.get("/edugate", async (req, res) => {
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

router.get("/resources", async (req, res) => {
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

router.get("/academic-atlas", async (req, res) => {
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

router.get("/cylinder", (req, res) => {
  res.render("cylinder");
});

router.get("/freshman-guid", (req, res) => {
  res.render("freshman-guid");
});

router.get("/cylinder/admin", (req, res) => {
  return res.status(403).render("UNAUTHORIZED");
});

module.exports = router;
