const express = require("express");
const router = express.Router();

const GameScore = require("../models/gamescore");
const { requireAuth, requirePageAuth } = require("../middleware/authMiddleware");

router.get("/leaderboard", async (req, res) => {
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

router.post("/leaderboard", requireAuth, async (req, res) => {
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


router.get("/game-landing-page", (req, res) => {
  res.render("game-landing-page");
});

// Safety redirects for old/wrong links
router.get("/game", (req, res) => {
  res.redirect("/blockblast");
});

router.get("/Game2", (req, res) => {
  res.redirect("/wordle");
});

router.get("/blockblast", requirePageAuth, (req, res) => {
  res.render("game");
});

router.get("/wordle", (req, res) => {
  res.render("Game2");
});



module.exports = router;
