const mongoose = require('mongoose');
const { Schema } = mongoose;

const optionSchema = new Schema({
  text: { type: String, required: true }
}, { _id: false });

const questionSchema = new Schema({
  questionType: { type: String, required: true, enum: ['mcq','fillblank','shortanswer','essay','matching','image'] },
  question: { type: String },
  marks: { type: Number, required: true },
  options: { type: [optionSchema], required: function() { return this.questionType === 'mcq'; } },
  correctAnswer: { type: Schema.Types.Mixed }, 
  image: { type: String, default: null }
}, { _id: false });

const quizSchema = new Schema({
  className: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  chapter: { type: String, required: true },
  status: { type: Boolean, default: true },
  questions: { type: [questionSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('QuizItem', quizSchema);
