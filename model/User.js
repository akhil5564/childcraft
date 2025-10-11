const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  originalPassword: { 
    type: String, 
    select: false 
  },
  encryptedPassword: { 
    type: String, 
    select: false 
  },
  role: { 
    type: String, 
    enum: ['admin', 'user', 'school'],
    default: 'user' 
  },
  status: { 
    type: Boolean, 
    default: true 
  },
  schoolDetails: {
    schoolName: String,
    schoolCode: { type: String, unique: true, sparse: true },
    executive: String,
    phone1: String,
    phone2: String,
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    principalName: String,
    examIncharge: String,
    email: String,
    address: String,
    status: { type: Boolean, default: true }
  }
}, { 
  timestamps: true 
});

// Pre-save middleware to handle password encryption
userSchema.pre('save', async function(next) {
  try {
    if (this.isModified('password')) {
      // Store encrypted version of original password
      this.encryptedPassword = encrypt(this.password);
      // Hash password for auth
      this.password = await bcrypt.hash(this.password, 10);
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);