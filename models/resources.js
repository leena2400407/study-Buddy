const mongoose = require("mongoose");

const resourceLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ["playlist", "website", "pdf", "book", "other"],
    default: "website"
  }
});

const resourceCategorySchema = new mongoose.Schema(
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
    color: {
      type: String,
      default: "#0077b6"
    },
    resources: {
      type: [resourceLinkSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ResourceCategory", resourceCategorySchema);