const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Question schema
 * - Stores section as string OR object
 * - Stores all incoming question JSON safely
 */
const questionSchema = new Schema(
  {
    questionId: { type: String },
    qtitle: { type: String },

    // ✅ allow section to be string OR object
    section: { type: Schema.Types.Mixed },

    question: { type: Schema.Types.Mixed, required: true },
    questionType: { type: String, required: true },
    mark: { type: Schema.Types.Mixed, required: true },

    subQuestions: [{ type: Schema.Types.Mixed }],
    options: [{ type: Schema.Types.Mixed }],

    correctAnswer: Schema.Types.Mixed,
    answer: Schema.Types.Mixed,
    imageUrl: Schema.Types.Mixed,

    directSubtype: Schema.Types.Mixed,
    mcqSubtype: Schema.Types.Mixed,
    answerFollowingSubtype: Schema.Types.Mixed
  },
  { _id: false }
);

/**
 * Examination schema
 */
const examinationSchema = new Schema(
  {
    school: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    class: { type: String, required: true },
    book: { type: String, required: true },

    // ✅ WILL BE STORED
    code: { type: String },

    chapters: [{ type: String, required: true }],
    examinationType: { type: String, required: true },
    totalMark: { type: Number, required: true },
    duration: { type: Number, required: true },
    schoolName: { type: String, required: true },

    questions: [questionSchema],

    // ✅ keep original payload for audit/debug
    rawPayload: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Examination', examinationSchema);
