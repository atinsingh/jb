import { Injectable } from '@nestjs/common';
import { MatchCalculatorService } from '../llm/features/match-calculator.service';
import { CoverLetterGeneratorService } from '../llm/features/cover-letter-generator.service';

export interface Candidate {
  skills?: string[];
  name?: string;
  summary?: string;
  [key: string]: any;
}

export interface Job {
  _id?: string;
  id?: string;
  title?: string;
  companyName?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  [key: string]: any;
}

export interface MatchResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
}

@Injectable()
export class JobMatchingService {
  constructor(
    private matchCalculatorService: MatchCalculatorService,
    private coverLetterGeneratorService: CoverLetterGeneratorService,
  ) {}

  async calculateMatch(
    userId: string,
    candidate: Candidate,
    job: Job,
  ): Promise<MatchResult> {
    try {
      const candidateSkills = candidate.skills || [];
      const jobRequirements = job.requirements?.join(', ') || 'Not specified';
      const jobDescription = job.description || '';

      const matchResult = await this.matchCalculatorService.calculateMatch(
        userId,
        candidateSkills,
        jobRequirements,
        jobDescription,
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

  simpleMatch(candidate: Candidate, job: Job): MatchResult {
    const candidateSkills = new Set(
      (candidate.skills || []).map((s) => s.toLowerCase()),
    );
    const jobSkills = new Set((job.skills || []).map((s) => s.toLowerCase()));
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of jobSkills) {
      if (candidateSkills.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const matchScore =
      jobSkills.size > 0
        ? Math.round((matchedSkills.length / jobSkills.size) * 100)
        : 50;

    return {
      matchScore,
      matchedSkills,
      missingSkills,
      reasoning: `Simple skill matching: ${matchedSkills.length}/${jobSkills.size} skills matched`,
    };
  }

  async getRecommendations(
    userId: string,
    candidate: Candidate,
    jobs: Job[],
    minScore: number = 60,
  ): Promise<Array<MatchResult & { job: Job }>> {
    const recommendations: Array<MatchResult & { job: Job }> = [];
    for (const job of jobs) {
      const match = await this.calculateMatch(userId, candidate, job);
      if (match.matchScore >= minScore) {
        recommendations.push({ job, ...match });
      }
    }
    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    return recommendations;
  }

  async generateCoverLetter(
    userId: string,
    candidate: Candidate,
    job: Job,
  ): Promise<string> {
    try {
      const candidateInfo = {
        name: candidate.name || 'Candidate',
        email: candidate.email || '',
        skills: candidate.skills || [],
        experience: candidate.summary || '',
        summary: candidate.summary || '',
      };
      const jobInfo = {
        title: job.title || '',
        companyName: job.companyName || '',
        description: job.description || '',
        requirements: job.requirements || [],
      };
      // Map the structured generator response back to the plain-string letter
      // the callers expect.
      const result = await this.coverLetterGeneratorService.generateCoverLetter(
        userId,
        candidateInfo,
        jobInfo,
      );
      return result.finalLetter;
    } catch (error) {
      console.error('Cover letter generation error:', error);
      throw new Error('Failed to generate cover letter');
    }
  }

  async batchMatch(
    userId: string,
    candidate: Candidate,
    jobs: Job[],
  ): Promise<Array<MatchResult & { jobId: string }>> {
    const matches: Array<MatchResult & { jobId: string }> = [];
    for (const job of jobs) {
      try {
        const match = await this.calculateMatch(userId, candidate, job);
        matches.push({
          jobId: job._id?.toString() || job.id?.toString() || '',
          ...match,
        });
      } catch (error) {
        console.error(`Error matching job ${job._id || job.id}:`, error);
      }
    }
    return matches;
  }
}

