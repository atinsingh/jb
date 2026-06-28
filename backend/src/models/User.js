const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: String,
  googleId: String,
  linkedinId: String,
  picture: String,
  provider: { type: String, enum: ['local', 'google', 'linkedin'], default: 'local' },
  role: { type: String, default: 'ROLE_CANDIDATE' },
  
  // Candidate Profile Fields
  phone: String,
  location: String,
  summary: String,
  skills: [String],
  experience: [{
    title: String,
    company: String,
    duration: String,
    description: String,
  }],
  education: [{
    degree: String,
    institution: String,
    year: String,
  }],
  resumePath: String,
  resumeText: String,
  
  // Settings
  autoApply: { type: Boolean, default: false },
  minMatchScore: { type: Number, default: 75 },
  preferredLocations: [String],
  preferredJobTypes: [String],
  
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  profileComplete: { type: Boolean, default: false },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);