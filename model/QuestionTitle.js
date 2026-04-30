const mongoose = require("mongoose");

const QuestionTitleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ["mcq", "fillblank", "shortanswer", "image"]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionTitle", QuestionTitleSchema);
