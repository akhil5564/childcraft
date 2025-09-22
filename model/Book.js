// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  book: { type: String, required: true },
  code: { type: String, required: true },
  subject: { type: String, required: true },
  class: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
