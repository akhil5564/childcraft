// models/chapter.js
const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  book: { type: String, required: true },
  code: { type: String, required: false },
  subject: { type: String, required: true },
  class: { type: String, required: true },
  chapters: [
    {
      chapterName: { type: String, required: true },
      number: { type: Number } // optional, if you want order
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Chapter', chapterSchema);