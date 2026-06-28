const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const resumeParserService = require('../resume-parser/resume-parser.service');
const User = require('../models/User');

/**
 * POST /api/resume/parse
 * Upload and parse resume
 */
router.post('/parse', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`📄 Parsing resume for user: ${req.user.email}`);
    
    // Parse resume
    const result = await resumeParserService.parseResume(req.file);
    
    // Update user profile with parsed data
    const updates = {
      name: result.parsedData.name || req.user.name,
      email: result.parsedData.email || req.user.email,
      phone: result.parsedData.phone || req.user.phone,
      summary: result.parsedData.summary || req.user.summary,
      skills: result.parsedData.skills || req.user.skills,
      experience: result.parsedData.experience || req.user.experience,
      education: result.parsedData.education || req.user.education,
      resumePath: result.filePath,
      resumeText: result.originalText,
      profileComplete: true,
    };
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true }
    ).select('-password');
    
    res.json({
      message: 'Resume parsed successfully',
      parsedData: result.parsedData,
      user,
    });
    
  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/resume/data
 * Get user's parsed resume data
 */
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      summary: user.summary,
      skills: user.skills,
      experience: user.experience,
      education: user.education,
      resumePath: user.resumePath,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resume data' });
  }
});

module.exports = router;