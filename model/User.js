// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
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
    schoolCode: String,
    executive: String,
    phone1: String,
    phone2: String,
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    principalName: String,
    examIncharge: String,
    email: String,
    address: String
  }
}, { 
  timestamps: true 
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

