const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    senderName: {
      type: String,
      required: true
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],

    matchRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchRequest",
      required: true
    },

    messages: [chatMessageSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Chat", chatSchema);