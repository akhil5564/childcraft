// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  book: { type: String, required: true },
  code: { type: String, required: true },
  subject: { type: String, required: true },
  class: { type: String, required: true },
  chapters: [
    {
      title: { type: String, required: true },  // Chapter name (e.g., Chapter 1, Introduction)
      number: { type: Number },                 // Optional: chapter number
      description: { type: String }             // Optional: extra info
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
