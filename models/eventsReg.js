const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fullName: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    university: {
      type: String,
      required: true
    },

    tournamentName: {
      type: String,
      required: true
    },

    teamName: {
      type: String,
      required: true
    },

    players: [
      {
        name: {
          type: String,
          required: true
        },
        email: {
          type: String,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);