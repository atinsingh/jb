const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const jobMatchingService = require('../job-matching/job-matching.service');
const applicationAgentService = require('../application-agent/application-agent.service');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

/**
 * POST /api/applications/apply/:jobId
 * Apply to a specific job
 */
router.post('/apply/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if already applied
    const existingApplication = await Application.findOne({
      candidateId: req.userId,
      jobId: job._id,
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }
    
    const user = await User.findById(req.userId);
    
    // Calculate match
    const match = await jobMatchingService.calculateMatch(user, job);
    
    // Generate cover letter
    const coverLetter = await jobMatchingService.generateCoverLetter(user, job);
    
    // Create application
    const application = await Application.create({
      candidateId: req.userId,
      jobId: job._id,
      matchScore: match.matchScore,
      coverLetter,
      resume: user.resumePath,
      status: 'pending',
      autoApplied: false,
    });
    
    console.log(`✅ Application created for ${user.email} - ${job.title}`);
    
    res.json({
      application,
      job,
      coverLetter,
    });
    
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/applications
 * Get all applications for user
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    
    const query = { candidateId: req.userId };
    
    if (status) {
      query.status = status;
    }
    
    const applications = await Application.find(query)
      .populate('jobId')
      .sort({ appliedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Application.countDocuments(query);
    
    res.json({
      applications,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * GET /api/applications/:id
 * Get specific application
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      candidateId: req.userId,
    }).populate('jobId');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

/**
 * PATCH /api/applications/:id/status
 * Update application status
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'submitted', 'reviewing', 'interviewed', 'rejected', 'accepted'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updates = { status };
    
    if (status === 'submitted' && !req.body.submittedAt) {
      updates.submittedAt = new Date();
    }
    
    if (notes) {
      updates.notes = notes;
    }
    
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, candidateId: req.userId },
      { $set: updates },
      { new: true }
    ).populate('jobId');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

/**
 * POST /api/applications/auto-apply
 * Auto-apply to jobs based on match score
 */
router.post('/auto-apply', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user.autoApply) {
      return res.status(400).json({ error: 'Auto-apply is disabled. Enable it in settings.' });
    }
    
    if (!user.profileComplete) {
      return res.status(400).json({ error: 'Please complete your profile first' });
    }
    
    // Get recent jobs
    const jobs = await Job.find({ isActive: true })
      .sort({ scrapedAt: -1 })
      .limit(100);
    
    console.log(`🤖 Auto-applying for ${user.email}`);
    
    // Auto-apply
    const applications = await applicationAgentService.autoApply(user, jobs);
    
    // Save applications
    const savedApplications = [];
    for (const appData of applications) {
      try {
        const app = await Application.create(appData);
        savedApplications.push(app);
      } catch (error) {
        console.error('Error saving application:', error.message);
      }
    }
    
    res.json({
      message: `Auto-applied to ${savedApplications.length} jobs`,
      applications: savedApplications,
      stats: applicationAgentService.getApplicationStats(savedApplications),
    });
    
  } catch (error) {
    console.error('Auto-apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/applications/stats
 * Get application statistics
 */
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.userId });
    const stats = applicationAgentService.getApplicationStats(applications);
    
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      candidateId: req.userId,
    });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

module.exports = router;