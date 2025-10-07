const mongoose = require('mongoose');
require('./Book'); // make sure path is correct

// Individual chapter schema
const chapterSchema = new mongoose.Schema({
  chapterName: { type: String, required: true },
  number: { type: Number, required: true }
}, { _id: true });

// Main chapters document schema
const chaptersSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  class: { type: String, required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  chapters: [chapterSchema]
}, { 
  timestamps: true  // Add this to enable automatic timestamps
});

module.exports = mongoose.model('Chapter', chaptersSchema);
