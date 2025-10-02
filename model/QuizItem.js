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
    questionType: {
      type: String,
      required: true,
      enum: ["mcq", "fillblank", "shortanswer", "essay", "matching", "image"]
    },
    question: { type: String, required: true },
    marks: { type: Number, required: true, min: 1 },

    // Options only if MCQ
    options: {
      type: [optionSchema],
      validate: {
        validator: function (val) {
          return this.questionType !== "mcq" || (Array.isArray(val) && val.length > 0);
        },
        message: "MCQ must have at least one option"
      }
    },

    // Make correctAnswer completely optional
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: false // No validation, completely optional
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
