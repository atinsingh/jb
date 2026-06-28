const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  matchedSkills: [{
    type: String,
  }],
  missingSkills: [{
    type: String,
  }],
  reasoning: {
    type: String,
    default: '',
  },
  isInterested: {
    type: Boolean,
    default: false,
  },
  viewedAt: {
    type: Date,
  },
  appliedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate matches
jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });
jobMatchSchema.index({ matchScore: -1 });
jobMatchSchema.index({ isInterested: 1 });

module.exports = mongoose.model('JobMatch', jobMatchSchema);
