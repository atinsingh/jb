const aiProvider = require('../ai-services/ai-provider');

class JobMatchingService {
  async calculateMatch(candidate, job) {
    try {
      const candidateSkills = candidate.skills || [];
      const jobRequirements = job.requirements?.join(', ') || 'Not specified';
      const jobDescription = job.description || '';

      const matchResult = await aiProvider.calculateJobMatch(
        candidateSkills, jobRequirements, jobDescription
      );

      return {
        matchScore: matchResult.matchScore || 0,
        matchedSkills: matchResult.matchedSkills || [],
        missingSkills: matchResult.missingSkills || [],
        reasoning: matchResult.reasoning || 'Match calculated by AI',
      };
    } catch (error) {
      console.error('Match calculation error:', error);
      return this.simpleMatch(candidate, job);
    }
  }

  simpleMatch(candidate, job) {
    const candidateSkills = new Set((candidate.skills || []).map(s => s.toLowerCase()));
    const jobSkills = new Set((job.skills || []).map(s => s.toLowerCase()));
    const matchedSkills = [];
    const missingSkills = [];

    for (const skill of jobSkills) {
      if (candidateSkills.has(skill)) matchedSkills.push(skill);
      else missingSkills.push(skill);
    }

    const matchScore = jobSkills.size > 0
      ? Math.round((matchedSkills.length / jobSkills.size) * 100)
      : 50;

    return {
      matchScore, matchedSkills, missingSkills,
      reasoning: `Simple skill matching: ${matchedSkills.length}/${jobSkills.size} skills matched`,
    };
  }

  async getRecommendations(candidate, jobs, minScore = 60) {
    const recommendations = [];
    for (const job of jobs) {
      const match = await this.calculateMatch(candidate, job);
      if (match.matchScore >= minScore) {
        recommendations.push({ job, ...match });
      }
    }
    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    return recommendations;
  }

  async generateCoverLetter(candidate, job) {
    try {
      const candidateInfo = {
        name: candidate.name || 'Candidate',
        skills: candidate.skills || [],
        experience: candidate.summary || '',
      };
      const jobInfo = {
        title: job.title,
        companyName: job.companyName,
        description: job.description,
      };
      const coverLetter = await aiProvider.generateCoverLetter(candidateInfo, jobInfo);
      return coverLetter;
    } catch (error) {
      console.error('Cover letter generation error:', error);
      throw new Error('Failed to generate cover letter');
    }
  }

  async batchMatch(candidate, jobs) {
    const matches = [];
    for (const job of jobs) {
      try {
        const match = await this.calculateMatch(candidate, job);
        matches.push({ jobId: job._id || job.id, ...match });
      } catch (error) {
        console.error(`Error matching job ${job._id}:`, error);
      }
    }
    return matches;
  }
}

module.exports = new JobMatchingService();
