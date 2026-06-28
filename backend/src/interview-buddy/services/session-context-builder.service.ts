import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Temporary type definitions until contracts package exports are fixed
type SessionContextPack = any;
type CandidateSnapshot = any;
type JobSnapshot = any;
type Rubric = any;
const SeniorityEnum = {
  INTERN: 'INTERN',
  JUNIOR: 'JUNIOR',
  MID: 'MID',
  SENIOR: 'SENIOR',
  STAFF: 'STAFF',
  PRINCIPAL: 'PRINCIPAL',
  MANAGER: 'MANAGER',
} as const;
const InterviewTypeEnum = {
  BEHAVIORAL: 'BEHAVIORAL',
  TECHNICAL: 'TECHNICAL',
  SYSTEM_DESIGN: 'SYSTEM_DESIGN',
  CODING: 'CODING',
  CASE: 'CASE',
  MIXED: 'MIXED',
} as const;
import { Resume, ResumeDocument } from '../../schemas/resume.schema';
import { Job, JobDocument } from '../../schemas/job.schema';

@Injectable()
export class SessionContextBuilderService {
  private readonly logger = new Logger(SessionContextBuilderService.name);

  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  async buildContextPack(
    userId: string,
    sessionId: string,
    mode: 'PRACTICE' | 'CONSENT' | 'LIVE_NOTES',
    roleTitle: string,
    resumeVersionId: string | undefined,
    jobDescriptionIds: string[] | undefined,
    companyName: string | undefined,
    roleFamily: 'SWE_BACKEND' | 'DEVOPS_CLOUD' | 'PM' | 'DATA' = 'SWE_BACKEND',
    seniority: 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL' | 'MANAGER' = 'MID',
    interviewType: 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CODING' | 'CASE' | 'MIXED' = 'MIXED',
  ): Promise<SessionContextPack> {
    // Fetch resume if provided
    let candidate: CandidateSnapshot | null = null;
    if (resumeVersionId) {
      const resume = await this.resumeModel.findById(resumeVersionId);
      if (resume && resume.userId.toString() === userId) {
        candidate = this.buildCandidateSnapshot(resume);
      }
    }

    // Fetch job descriptions if provided
    let job: JobSnapshot | null = null;
    if (jobDescriptionIds && jobDescriptionIds.length > 0) {
      const jobs = await this.jobModel.find({ _id: { $in: jobDescriptionIds } });
      if (jobs.length > 0) {
        job = this.buildJobSnapshot(jobs[0], roleTitle, companyName);
      }
    }

    // Build default candidate if no resume
    if (!candidate) {
      candidate = {
        headline: 'Software Engineer',
        summaryBullets: ['Experienced software engineer'],
        coreSkills: ['JavaScript', 'TypeScript', 'Node.js'],
        domainTags: [],
        achievements: [],
      };
    }

    // Build default job if no JD provided
    if (!job) {
      job = {
        jobTitle: roleTitle,
        companyName: companyName,
        responsibilities: ['Develop and maintain software applications'],
        requiredSkills: ['JavaScript', 'TypeScript'],
        preferredSkills: [],
        keywords: [],
      };
    }

    // Get rubric based on role family, interview type, and seniority
    const rubric = this.getRubric(roleFamily, interviewType, seniority);

    const contextPack: SessionContextPack = {
      schemaVersion: '1.0',
      sessionId,
      mode,
      resumeVersionId: resumeVersionId || undefined,
      jobId: jobDescriptionIds?.[0] || undefined,
      targetRoleTitle: roleTitle,
      roleFamily,
      seniority,
      interviewType,
      candidate,
      job,
      constraints: {
        answerTimeSecondsOptions: [30, 60, 120],
        style: 'BALANCED',
        language: 'en',
      },
      rubric,
      createdAt: new Date().toISOString(),
    };

    return contextPack;
  }

  private buildCandidateSnapshot(resume: ResumeDocument): CandidateSnapshot {
    const experience = resume.experience || [];
    const education = resume.education || [];
    const skills = resume.skills || [];

    // Extract summary bullets from summary or experience
    const summaryBullets = resume.summary
      ? resume.summary.split('\n').filter((b) => b.trim().length > 0).slice(0, 12)
      : experience.slice(0, 3).map((exp) => `${exp.title} at ${exp.company}`);

    // Extract achievements from experience
    const achievements = experience.flatMap((exp) => {
      const descLines = (exp.description || '').split('\n').filter((line) => line.trim().length > 0);
      const achievementLines = (exp.achievements || []).map((a) => a.toString());
      const allLines = [...descLines, ...achievementLines].slice(0, 3);
      
      return allLines.map((text) => ({
        text: text.trim().substring(0, 240),
        evidence: [
          {
            source: 'RESUME' as const,
            sourceId: resume._id.toString(),
            section: `Experience: ${exp.company} - ${exp.title}`,
          },
        ],
        confidence: 0.9,
        needsUserConfirmation: false,
      }));
    }).slice(0, 30);

    const headline = resume.fullName 
      ? `${resume.fullName} - ${experience[0]?.title || 'Software Engineer'}`
      : experience[0]?.title || 'Software Engineer';

    return {
      headline: headline.substring(0, 120),
      summaryBullets: summaryBullets.slice(0, 12).map((b) => b.substring(0, 240)),
      coreSkills: skills.slice(0, 40).map((s) => s.substring(0, 80)),
      domainTags: [],
      achievements,
    };
  }

  private buildJobSnapshot(
    job: JobDocument,
    roleTitle: string,
    companyName?: string,
  ): JobSnapshot {
    const description = job.description || '';
    const requirements = job.requirements || [];
    const skills = job.skills || [];

    // Extract responsibilities from description
    const responsibilities = description
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(0, 20)
      .map((r) => r.trim().substring(0, 300));

    // Extract skills from requirements and skills array
    const allSkills = [...(requirements || []), ...(skills || [])]
      .filter((r) => typeof r === 'string')
      .slice(0, 40)
      .map((s) => s.substring(0, 80));

    return {
      jobTitle: roleTitle || job.title || 'Software Engineer',
      companyName: companyName || job.companyName || undefined,
      location: job.location || undefined,
      responsibilities: responsibilities.length > 0 ? responsibilities : ['See job description'],
      requiredSkills: allSkills.length > 0 ? allSkills : ['See requirements'],
      preferredSkills: [],
      keywords: [],
    };
  }

  private getRubric(
    roleFamily: 'SWE_BACKEND' | 'DEVOPS_CLOUD' | 'PM' | 'DATA',
    interviewType: 'BEHAVIORAL' | 'TECHNICAL' | 'SYSTEM_DESIGN' | 'CODING' | 'CASE' | 'MIXED',
    seniority: 'INTERN' | 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' | 'PRINCIPAL' | 'MANAGER',
  ): Rubric {
    // Simplified rubric - in production, load from database
    const rubricId = `${roleFamily}_${interviewType}_${seniority}_v1`;

    // Default dimensions based on role family
    const dimensions = this.getDefaultDimensions(roleFamily, interviewType);

    return {
      rubricId,
      roleFamily,
      interviewType,
      seniority,
      dimensions,
    };
  }

  private getDefaultDimensions(
    roleFamily: string,
    interviewType: string,
  ): Rubric['dimensions'] {
    // Simplified - in production, load from seed data
    return [
      {
        key: 'problem_solving',
        name: 'Problem Solving',
        description: 'Ability to analyze and solve problems systematically',
        weight: 0.25,
        anchors: {
          score1: 'Struggles with basic problems; no clear approach',
          score3: 'Can solve problems with guidance; some structure',
          score5: 'Excellent problem-solving; clear methodology',
        },
      },
      {
        key: 'communication',
        name: 'Communication',
        description: 'Clarity and effectiveness of communication',
        weight: 0.20,
        anchors: {
          score1: 'Unclear; hard to follow',
          score3: 'Mostly clear; minor issues',
          score5: 'Excellent communication; clear and concise',
        },
      },
      {
        key: 'technical_depth',
        name: 'Technical Depth',
        description: 'Depth of technical knowledge and understanding',
        weight: 0.25,
        anchors: {
          score1: 'Shallow knowledge; incorrect basics',
          score3: 'Solid basics; some gaps',
          score5: 'Deep expertise; comprehensive understanding',
        },
      },
      {
        key: 'authenticity',
        name: 'Authenticity',
        description: 'Credibility and consistency of responses',
        weight: 0.15,
        anchors: {
          score1: 'Feels inflated; unsupported claims',
          score3: 'Mostly credible',
          score5: 'Highly credible; evidence-based',
        },
      },
      {
        key: 'impact',
        name: 'Impact',
        description: 'Demonstrated impact and outcomes',
        weight: 0.15,
        anchors: {
          score1: 'No clear impact',
          score3: 'Some impact demonstrated',
          score5: 'Clear, measurable impact',
        },
      },
    ];
  }
}

