const mongoose = require("mongoose");

const bracketTeamSchema = new mongoose.Schema(
  {
    slot: {
      type: Number,
      required: true
    },

    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventRegistration",
      default: null
    },

    teamName: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);

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
    },

    bracket: {
      roundOf8: {
        type: [bracketTeamSchema],
        default: []
      },

      semiFinal: {
        type: [bracketTeamSchema],
        default: []
      },

      final: {
        type: [bracketTeamSchema],
        default: []
      },

      winner: {
        teamName: {
          type: String,
          default: ""
        },

        registrationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "EventRegistration",
          default: null
        }
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", eventSchema);