const jobMatchingService = require('../job-matching/job-matching.service');

class ApplicationAgentService {
  constructor() {
    this.autoApplicationEnabled = process.env.AUTO_APPLICATION_ENABLED === 'true';
    this.minMatchScore = parseInt(process.env.MIN_MATCH_SCORE_FOR_AUTO_APPLY) || 75;
    this.maxApplicationsPerDay = parseInt(process.env.MAX_APPLICATIONS_PER_DAY) || 20;
  }

  async autoApply(candidate, jobs) {
    if (!this.autoApplicationEnabled) {
      throw new Error('Auto-application is disabled');
    }

    const applications = [];
    let applicationsToday = 0;

    console.log(`🤖 Starting auto-apply for candidate: ${candidate.email}`);

    for (const job of jobs) {
      if (applicationsToday >= this.maxApplicationsPerDay) {
        console.log('⚠️ Daily application limit reached');
        break;
      }

      try {
        const match = await jobMatchingService.calculateMatch(candidate, job);

        if (match.matchScore < this.minMatchScore) {
          console.log(`❌ Skipping ${job.title} - match score too low (${match.matchScore})`);
          continue;
        }

        const coverLetter = await jobMatchingService.generateCoverLetter(candidate, job);

        const application = {
          candidateId: candidate._id,
          jobId: job._id,
          matchScore: match.matchScore,
          coverLetter,
          status: 'pending',
          appliedAt: new Date(),
          autoApplied: true,
        };

        applications.push(application);
        applicationsToday++;

        console.log(`✅ Applied to: ${job.title} at ${job.companyName} (${match.matchScore}% match)`);
      } catch (error) {
        console.error(`Error applying to job ${job._id}:`, error);
      }
    }

    console.log(`🎉 Auto-applied to ${applications.length} jobs`);
    return applications;
  }

  async shouldAutoApply(candidate, job) {
    try {
      const match = await jobMatchingService.calculateMatch(candidate, job);
      return {
        shouldApply: match.matchScore >= this.minMatchScore,
        matchScore: match.matchScore,
        reasoning: match.reasoning,
      };
    } catch (error) {
      console.error('Auto-apply check error:', error);
      return { shouldApply: false, matchScore: 0, reasoning: 'Error calculating match' };
    }
  }

  getApplicationStats(applications) {
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const submitted = applications.filter(a => a.status === 'submitted').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    const avgMatchScore = total > 0
      ? applications.reduce((sum, a) => sum + a.matchScore, 0) / total
      : 0;

    return { total, pending, submitted, rejected, averageMatchScore: Math.round(avgMatchScore) };
  }

  async submitApplication(application) {
    console.log(`📤 Submitting application to ${application.jobId}`);
    return { ...application, status: 'submitted', submittedAt: new Date() };
  }
}

module.exports = new ApplicationAgentService();
