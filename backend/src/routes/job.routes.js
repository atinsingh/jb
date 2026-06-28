const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const jobScraperService = require('../job-scraper/job-scraper.service');
const Job = require('../models/Job');

/**
 * POST /api/jobs/scrape
 * Trigger job scraping
 */
router.post('/scrape', authMiddleware, async (req, res) => {
  try {
    const { keywords, location } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords array required' });
    }
    
    console.log(`🔍 Scraping jobs for: ${keywords.join(', ')} in ${location || 'any location'}`);
    
    // Scrape jobs
    const scrapedJobs = await jobScraperService.scrapeAllSources(keywords, location || '');
    
    // Save to database (prevent duplicates)
    let savedCount = 0;
    for (const jobData of scrapedJobs) {
      try {
        await Job.findOneAndUpdate(
          { externalId: jobData.externalId },
          jobData,
          { upsert: true, new: true }
        );
        savedCount++;
      } catch (error) {
        console.error(`Error saving job ${jobData.externalId}:`, error.message);
      }
    }
    
    res.json({
      message: 'Job scraping completed',
      scraped: scrapedJobs.length,
      saved: savedCount,
    });
    
  } catch (error) {
    console.error('Job scraping error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/search
 * Search jobs
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const {
      keywords,
      location,
      skills,
      source,
      limit = 50,
      skip = 0,
    } = req.query;
    
    const query = { isActive: true };
    
    // Text search
    if (keywords) {
      query.$text = { $search: keywords };
    }
    
    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }
    
    // Source filter
    if (source) {
      query.source = source;
    }
    
    const jobs = await Job.find(query)
      .sort({ scrapedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Job.countDocuments(query);
    
    res.json({
      jobs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ error: 'Failed to search jobs' });
  }
});

/**
 * GET /api/jobs/:id
 * Get job details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * GET /api/jobs
 * Get all jobs
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const jobs = await Job.find({ isActive: true })
      .sort({ scrapedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Job.countDocuments({ isActive: true });
    
    res.json({
      jobs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

module.exports = router;