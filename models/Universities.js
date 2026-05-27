const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    shortName: {
      type: String,
      required: true,
      trim: true
    },

    imagePath: {
      type: String,
      required: true,
      trim: true
    },

    overview: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    academics: {
      type: [String],
      default: []
    },

    whyChoose: {
      type: [String],
      default: []
    },

    studentLife: {
      type: [String],
      default: []
    },

    contactInfo: {
      type: String,
      default: ""
    },

    portalLink: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("University", universitySchema);