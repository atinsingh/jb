const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidateId: {
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
    default: 0,
  },
  coverLetter: {
    type: String,
    default: '',
  },
  resume: {
    type: String, // File path or URL
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'reviewing', 'interviewed', 'rejected', 'accepted'],
    default: 'pending',
  },
  autoApplied: {
    type: Boolean,
    default: false,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// Indexes
applicationSchema.index({ candidateId: 1, jobId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
