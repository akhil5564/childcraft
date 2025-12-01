const mongoose = require('mongoose');
const User = require('../model/User');
const { encrypt } = require('../utils/encryption');
require('dotenv').config();

async function migratePasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const schools = await User.find({ 
      role: 'school', 
      originalPassword: { $exists: false } 
    });

    console.log(`Found ${schools.length} schools to migrate`);

    for (const school of schools) {
      // Since we can't recover the original password, 
      // we'll set it to a default encrypted value
      school.originalPassword = encrypt('defaultPassword123');
      await school.save();
      console.log(`Migrated school: ${school.username}`);
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migratePasswords();