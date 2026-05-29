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
    role: {
      type: String,
      enum: ["captain", "player"],
      default: "player"
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ""
    }
  }
],
captainName: {
  type: String,
  default: ""
},
captainEmail: {
  type: String,
  default: ""
}
  }
);

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);