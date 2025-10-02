const mongoose = require("mongoose");
const { Schema } = mongoose;

// ✅ Option schema (for MCQs)
const optionSchema = new Schema(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false } // helpful if multiple correct answers are needed
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

    // Correct answer
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: function () {
        return ["mcq", "fillblank", "shortanswer", "matching"].includes(this.questionType);
      }
    },

    // Store Cloudinary image URL
    imageUrl: { type: String, default: null }
  },
  { _id: false }
);

// ✅ Quiz schema
const quizSchema = new Schema(
  {
    className: { type: String, required: true, trim: true }, // e.g., "3"
    subject: { type: String, required: true, trim: true },   // e.g., "Math"
    book: { type: String, required: true, trim: true },      // e.g., "NCERT"
    title: { type: String, required: true, trim: true },     // e.g., "Quiz 1"
    chapter: { type: String, required: true, trim: true },   // e.g., "Chapter 2"
    status: { type: Boolean, default: true },                // Active/Inactive
    questions: { type: [questionSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizItem", quizSchema);
