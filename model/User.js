const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  originalPassword: { type: String }, // For storing plain password
  role: { 
    type: String, 
    enum: ['admin', 'user', 'school'],
    default: 'school' 
  },
  status: { 
    type: Boolean, 
    default: true 
  },
  schoolDetails: {
    schoolName: String,
    schoolCode: String,
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
}, { timestamps: true });

// Remove the password hashing middleware if it exists

module.exports = mongoose.model('User', userSchema);