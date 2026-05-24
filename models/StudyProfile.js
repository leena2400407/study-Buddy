const mongoose = require("mongoose");

const studyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    fullName: {
      type: String,
      required: true
    },

    username: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    university: {
      type: String,
      default: ""
    },

    major: {
      type: String,
      default: ""
    },

    weakSubjects: {
      type: [String],
      default: []
    },

    strongSubjects: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("StudyProfile", studyProfileSchema);