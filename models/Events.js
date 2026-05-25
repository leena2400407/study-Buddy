const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    imagePath: {
      type: String,
      required: true
    },

    buttonType: {
      type: String,
      required: true,
      enum: ["register", "details"]
    },

    detailsLink: {
      type: String,
      default: ""
    },

    maxPlayers: {
      type: Number,
      default: 10
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", eventSchema);


















