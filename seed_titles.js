const mongoose = require('mongoose');
require('dotenv').config();
const QuestionTitle = require('./model/QuestionTitle');

const DEFAULT_TITLES = {
  mcq: [
    "Choose the correct answer from the brackets and fill in the blanks",
    "Tick the correct answers",
    "Choose the correct answers",
  ],
  fillblank: [
    "Fill in the blanks with correct answers",
    "Write true or false",
    "Name the following",
    "Tick the odd one in the following",
    "Match the following",
    "Give one word of the following",
  ],
  shortanswer: [
    "Define the following",
    "Short Answer Questions",
    "Long Answer Questions",
    "Paragraph Writing",
    "Essay Writing",
    "Letter Writing",
  ],
  image: [
    "Identity the pictures",
    "Look at the pictures and answer the following",
    "Describe the following picture.",
  ],
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp');
    console.log('Connected to MongoDB');

    let totalCreated = 0;
    for (const [type, titles] of Object.entries(DEFAULT_TITLES)) {
      for (const name of titles) {
        const existing = await QuestionTitle.findOne({ name, type });
        if (!existing) {
          await QuestionTitle.create({ name, type });
          totalCreated++;
          console.log(`Created: [${type}] ${name}`);
        }
      }
    }

    console.log(`\nSeed completed! Created ${totalCreated} new titles.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
