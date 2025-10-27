const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  question: { type: String, required: true },
  questionType: { type: String, required: true },
  mark: { type: Number, required: true },
  options: [String], // Optional, for MCQ
  answer: String,    // Optional, for subjective
  imageUrl: String   // <-- Add this line
}, { _id: false });

const examinationSchema = new Schema({
  school: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  class: { type: String, required: true },
  book: { type: String, required: true },
  chapters: [{ type: String, required: true }],
  examinationType: { type: String, required: true },
  totalMark: { type: Number, required: true },
  duration: { type: Number, required: true },
  schoolName: { type: String, required: true },
  questions: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Examination', examinationSchema);