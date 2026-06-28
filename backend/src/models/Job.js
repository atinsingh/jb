const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: 'Not specified',
  },
  description: {
    type: String,
    default: '',
  },
  skills: [{
    type: String,
  }],
  requirements: [{
    type: String,
  }],
  salary: {
    type: String,
    default: 'Not specified',
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    default: 'Full-time',
  },
  experience: {
    type: String,
    default: 'Not specified',
  },
  source: {
    type: String,
    enum: ['LinkedIn', 'Indeed', 'Glassdoor', 'Manual'],
    required: true,
  },
  externalUrl: {
    type: String,
    default: '',
  },
  externalId: {
    type: String,
    unique: true,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  scrapedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for search
jobSchema.index({ title: 'text', description: 'text', companyName: 'text' });
jobSchema.index({ skills: 1 });
jobSchema.index({ location: 1 });
// externalId already has unique index from schema definition

module.exports = mongoose.model('Job', jobSchema);
