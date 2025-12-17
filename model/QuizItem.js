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

// ✅ Sub-question schema (for Picture questions)
const subQuestionSchema = new Schema(
  {
    text: { type: String, required: true }
  },
  { _id: false }
);

// ✅ Question schema
const questionSchema = new Schema(
  {
    qtitle: { 
      type: String, 
      required: true,
      validate: {
        validator: function(value) {
          return value && value.trim().length > 0;
        },
        message: 'qtitle must be provided and cannot be empty'
      }
    },
    // ✅ NEW: Section field before questionType
    section: {
      type: String,
      required: false,
      trim: true,
      default: null
    },
    questionType: {
      type: String,
      required: true,
      enum: ["Multiple Choice", "Direct Questions", "Answer the following questions", "Picture questions"]
    },
    question: { type: String, required: true },
    
    // ✅ Add question1, question2, etc. fields directly
    question1: { type: String, required: false },
    question2: { type: String, required: false },
    question3: { type: String, required: false },
    question4: { type: String, required: false },
    question5: { type: String, required: false },
    
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

    // Sub-questions for Picture questions
    subQuestions: {
      type: [subQuestionSchema],
      validate: {
        validator: function (val) {
          return this.questionType !== "Picture questions" || (Array.isArray(val) && val.length > 0);
        },
        message: "Picture questions must have at least one sub-question"
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