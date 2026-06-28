const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const jobMatchingService = require('../job-matching/job-matching.service');
const Job = require('../models/Job');
const JobMatch = require('../models/JobMatch');
const User = require('../models/User');

/**
 * POST /api/matching/calculate/:jobId
 * Calculate match for a specific job
 */
router.post('/calculate/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const user = await User.findById(req.userId);
    
    console.log(`🎯 Calculating match for ${user.email} - ${job.title}`);
    
    // Calculate match
    const matchResult = await jobMatchingService.calculateMatch(user, job);
    
    // Save or update match
    const match = await JobMatch.findOneAndUpdate(
      { userId: req.userId, jobId: job._id },
      {
        userId: req.userId,
        jobId: job._id,
        ...matchResult,
      },
      { upsert: true, new: true }
    );
    
    res.json({
      match,
      job,
    });
    
  } catch (error) {
    console.error('Match calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/matching/matches
 * Get all matches for user
 */
router.get('/matches', authMiddleware, async (req, res) => {
  try {
    const { minScore, isInterested, limit = 50, skip = 0 } = req.query;
    
    const query = { userId: req.userId };
    
    if (minScore) {
      query.matchScore = { $gte: parseInt(minScore) };
    }
    
    if (isInterested !== undefined) {
      query.isInterested = isInterested === 'true';
    }
    
    const matches = await JobMatch.find(query)
      .populate('jobId')
      .sort({ matchScore: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await JobMatch.countDocuments(query);
    
    res.json({
      matches,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * PATCH /api/matching/interest/:jobId
 * Mark job as interested/not interested
 */
router.patch('/interest/:jobId', authMiddleware, async (req, res) => {
  try {
    const { interested } = req.body;
    
    const match = await JobMatch.findOneAndUpdate(
      { userId: req.userId, jobId: req.params.jobId },
      { isInterested: interested },
      { new: true }
    ).populate('jobId');
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found. Calculate match first.' });
    }
    
    res.json({ match });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

/**
 * GET /api/matching/interested
 * Get all interested jobs
 */
router.get('/interested', authMiddleware, async (req, res) => {
  try {
    const matches = await JobMatch.find({
      userId: req.userId,
      isInterested: true,
    })
      .populate('jobId')
      .sort({ matchScore: -1 });
    
    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interested jobs' });
  }
});

/**
 * GET /api/matching/recommendations
 * Get AI-powered job recommendations
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const user = await User.findById(req.userId);
    
    if (!user.profileComplete) {
      return res.status(400).json({ error: 'Please complete your profile first' });
    }
    
    // Get recent jobs
    const jobs = await Job.find({ isActive: true })
      .sort({ scrapedAt: -1 })
      .limit(100);
    
    console.log(`🤖 Generating recommendations for ${user.email}`);
    
    // Get recommendations
    const recommendations = await jobMatchingService.getRecommendations(
      user,
      jobs,
      60 // min score
    );
    
    // Save matches
    for (const rec of recommendations.slice(0, parseInt(limit))) {
      try {
        await JobMatch.findOneAndUpdate(
          { userId: req.userId, jobId: rec.job._id },
          {
            userId: req.userId,
            jobId: rec.job._id,
            matchScore: rec.matchScore,
            matchedSkills: rec.matchedSkills,
            missingSkills: rec.missingSkills,
            reasoning: rec.reasoning,
          },
          { upsert: true }
        );
      } catch (error) {
        console.error('Error saving match:', error.message);
      }
    }
    
    res.json({
      recommendations: recommendations.slice(0, parseInt(limit)),
      total: recommendations.length,
    });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/matching/batch
 * Batch calculate matches for multiple jobs
 */
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { jobIds } = req.body;
    
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'Job IDs array required' });
    }
    
    const user = await User.findById(req.userId);
    const jobs = await Job.find({ _id: { $in: jobIds } });
    
    const matches = await jobMatchingService.batchMatch(user, jobs);
    
    // Save matches
    for (const match of matches) {
      await JobMatch.findOneAndUpdate(
        { userId: req.userId, jobId: match.jobId },
        {
          userId: req.userId,
          jobId: match.jobId,
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          reasoning: match.reasoning,
        },
        { upsert: true }
      );
    }
    
    res.json({ matches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;