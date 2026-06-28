/**
 * Main Routes Index
 * All API routes combined
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const resumeRoutes = require('./resume.routes');
const jobRoutes = require('./job.routes');
const matchingRoutes = require('./matching.routes');
const applicationRoutes = require('./application.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/resume', resumeRoutes);
router.use('/jobs', jobRoutes);
router.use('/matching', matchingRoutes);
router.use('/applications', applicationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Services running' });
});

module.exports = router;
