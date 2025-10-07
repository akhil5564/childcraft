const mongoose = require('mongoose');
require('./Book'); // make sure path is correct

// Individual chapter sub-schema
const individualChapterSchema = new mongoose.Schema({
  chapterName: { 
    type: String, 
    required: [true, 'Chapter name is required'],
    trim: true
  },
  number: { 
    type: Number,
    required: [true, 'Chapter number is required'],
    min: [1, 'Chapter number must be at least 1']
  }
}, { 
  _id: true, // Enable _id for individual chapters
  timestamps: true // Track timestamps for individual chapters
});

// Main chapter schema
const chapterSchema = new mongoose.Schema({
  book: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Book",
    required: [true, 'Book reference is required']
  },
  subject: { 
    type: String, 
    required: [true, 'Subject is required'],
    trim: true,
    lowercase: true
  },
  class: { 
    type: String, 
    required: [true, 'Class is required'],
    trim: true
  },
  chapters: [individualChapterSchema]
}, { 
  timestamps: true, // Track timestamps for the main document
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true }
});

// Add virtual for chapter count
chapterSchema.virtual('chapterCount').get(function() {
  return this.chapters?.length || 0;
});

// Pre-save middleware to ensure chapter numbers are sequential
chapterSchema.pre('save', function(next) {
  if (this.chapters && this.chapters.length > 0) {
    this.chapters.forEach((chapter, index) => {
      chapter.number = index + 1;
    });
  }
  next();
});

// Add index for better query performance
chapterSchema.index({ subject: 1, class: 1, 'book': 1 });
chapterSchema.index({ createdAt: -1 }); // Index for timestamp sorting

module.exports = mongoose.model('Chapter', chapterSchema);
