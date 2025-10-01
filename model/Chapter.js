const mongoose = require('mongoose');
require('./Book'); // make sure path is correct

const chapterSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" }, // reference by ID
  subject: { type: String, required: true },
  class: { type: String, required: true },
  chapters: [
    {
      chapterName: { type: String, required: true },
      number: { type: Number }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Chapter', chapterSchema);
