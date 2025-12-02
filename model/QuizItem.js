const mongoose = require("mongoose");
const { Schema } = mongoose;

// ✅ Option schema (for MCQs)
const optionSchema = new Schema(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

// ✅ Question schema
const questionSchema = new Schema(
  {
    qtitle: { type: String, required: true }, // ✅ Added qtitle to each question
    questionType: {
      type: String,
      required: true,
      enum: ["Multiple Choice", "Direct Questions", "Answer the following questions", "Picture questions"]
    },
    question: { type: String, required: true },
    marks: { type: Number, required: true, min: 1 },

    // Options only if Multiple Choice
    options: {
      type: [optionSchema],
      validate: {
        validator: function (val) {
          return this.questionType !== "Multiple Choice" || (Array.isArray(val) && val.length > 0);
        },
        message: "Multiple Choice must have at least one option"
      }
    },

    // Make correctAnswer completely optional
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: false
    },

    // Store Cloudinary image URL
    imageUrl: { type: String, default: null }
  },
  { _id: false }
);

// ✅ Main QuizItem schema
const quizItemSchema = new Schema(
  {
    className: { type: String, required: true },
    subject: { type: String, required: true },
    book: { type: String, required: true },
    title: { type: String, required: true },
    chapter: { type: String, required: true },
    status: { type: Boolean, default: true },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: "At least one question is required"
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizItem", quizItemSchema);