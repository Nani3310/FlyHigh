const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  mobile: { type: String, required: true },
  role: { type: String, default: 'user' },
  experienceYears: { type: Number },
  licenseDocument: { type: String },
  approvalStatus: { type: String, default: 'Pending' }
});

module.exports = mongoose.model('User', userSchema);
