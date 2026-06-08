const mongoose = require("mongoose");

const matchRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    senderName: {
      type: String,
      required: true
    },

    senderEmail: {
      type: String,
      required: true
    },

    receiverName: {
      type: String,
      required: true
    },

    receiverEmail: {
      type: String,
      required: true
    },

    senderWeakSubject: {
      type: String,
      default: ""
    },

    senderStrongSubject: {
      type: String,
      default: ""
    },

    receiverWeakSubject: {
      type: String,
      default: ""
    },

    receiverStrongSubject: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "rescheduled", "matched"],
      default: "pending"
    },

    emailToken: {
      type: String,
      required: true
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null
    },

    scheduledAt: {
      type: Date,
      default: null
    },

    emailSentAt: {
      type: Date,
      default: null
    },

    roomId: {
      type: String,
      default: ""
    },

    meetingLink: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("MatchRequest", matchRequestSchema);