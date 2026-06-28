import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';

export interface JobIngestionInput {
  url?: string;
  jobDescription?: string;
  title?: string;
  companyName?: string;
  location?: string;
  allowManualEdit?: boolean;
}

export interface ParsedJobData {
  title: string;
  companyName: string;
  location: string;
  description: string;
  skills: string[];
  requirements: string[];
  salary?: string;
  jobType?: string;
  experience?: string;
  canonicalUrl?: string;
}

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly llmRoutingService: LLMRoutingService,
  ) {}

  /**
   * Ingest job from URL and/or job description
   */
  async ingestJob(
    userId: string,
    input: JobIngestionInput,
  ): Promise<JobDocument> {
    let parsedData: Partial<ParsedJobData> = {};

    if (input.url) {
      // Try to parse from URL first
      const urlParsed = await this.parseFromUrl(input.url);
      parsedData = { ...parsedData, ...urlParsed };
    }

    if (input.jobDescription) {
      // Parse from job description using LLM
      const llmParsed = await this.parseFromJobDescription(input.jobDescription);
      // Merge with URL parsed data if available
      parsedData = { ...parsedData, ...llmParsed };
    }

    // Override with manual inputs if provided
    if (input.title) parsedData.title = input.title;
    if (input.companyName) parsedData.companyName = input.companyName;
    if (input.location) parsedData.location = input.location;

    // Ensure required fields have defaults
    const finalData: ParsedJobData = {
      title: parsedData.title || 'Untitled Position',
      companyName: parsedData.companyName || 'Unknown Company',
      location: parsedData.location || 'Not specified',
      description: parsedData.description || input.jobDescription || '',
      skills: parsedData.skills || [],
      requirements: parsedData.requirements || [],
      salary: parsedData.salary,
      jobType: parsedData.jobType,
      experience: parsedData.experience,
      canonicalUrl: parsedData.canonicalUrl,
    };

    // Generate canonical URL for deduplication
    const canonicalUrl = finalData.canonicalUrl || this.generateCanonicalUrl(
      finalData.companyName,
      finalData.title,
      finalData.location,
    );

    // Check for duplicates
    const existing = await this.findDuplicate(canonicalUrl, finalData);
    if (existing) {
      this.logger.log(`Found duplicate job: ${existing._id}`);
      return existing;
    }

    // Create new job
    const job = new this.jobModel({
      ...finalData,
      canonicalUrl,
      source: input.url ? 'Manual' : 'Manual',
      externalId: this.generateExternalId(canonicalUrl),
      addedBy: userId,
      isManualEntry: true,
    });

    return job.save();
  }

  /**
   * Parse job data from URL (basic extraction)
   */
  private async parseFromUrl(url: string): Promise<Partial<ParsedJobData>> {
    try {
      // Basic URL parsing - extract domain, try to infer company
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      return {
        canonicalUrl: this.normalizeUrl(url),
        companyName: this.extractCompanyFromDomain(domain),
      };
    } catch (error) {
      this.logger.warn(`Failed to parse URL: ${url}`, error);
      return {};
    }
  }

  /**
   * Parse job data from job description using LLM
   */
  private async parseFromJobDescription(
    jobDescription: string,
  ): Promise<ParsedJobData> {
    const provider = this.llmRoutingService.getProviderForFeature(
      LLMFeature.PARSE_RESUME, // Reuse parse resume feature for now
    );
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.PARSE_RESUME);

    const prompt = `Extract structured information from this job description. Return ONLY valid JSON:
{
  "title": "job title",
  "companyName": "company name",
  "location": "location",
  "description": "full job description",
  "skills": ["skill1", "skill2"],
  "requirements": ["requirement1", "requirement2"],
  "salary": "salary range if mentioned",
  "jobType": "Full-time/Part-time/Contract/etc",
  "experience": "required experience level"
}

Job Description:
${jobDescription}`;

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are a job description parser. Extract structured data and return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      return {
        title: parsed.title || 'Untitled Position',
        companyName: parsed.companyName || 'Unknown Company',
        location: parsed.location || 'Not specified',
        description: parsed.description || jobDescription,
        skills: parsed.skills || [],
        requirements: parsed.requirements || [],
        salary: parsed.salary,
        jobType: parsed.jobType,
        experience: parsed.experience,
      };
    } catch (error) {
      this.logger.error('Error parsing job description with LLM:', error);
      // Fallback to basic extraction
      return {
        title: 'Untitled Position',
        companyName: 'Unknown Company',
        location: 'Not specified',
        description: jobDescription,
        skills: [],
        requirements: [],
      };
    }
  }

  /**
   * Find duplicate job
   */
  private async findDuplicate(
    canonicalUrl: string,
    data: ParsedJobData,
  ): Promise<JobDocument | null> {
    // Try to find by canonical URL first
    if (canonicalUrl) {
      const byUrl = await this.jobModel.findOne({ canonicalUrl });
      if (byUrl) return byUrl;
    }

    // Try to find by company + title + location
    const byFields = await this.jobModel.findOne({
      companyName: data.companyName,
      title: data.title,
      location: data.location,
    });

    return byFields;
  }

  /**
   * Generate canonical URL for deduplication
   */
  private generateCanonicalUrl(
    company: string,
    title: string,
    location: string,
  ): string {
    const normalized = `${company.toLowerCase()}-${title.toLowerCase()}-${location.toLowerCase()}`
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    return `job://${normalized}`;
  }

  /**
   * Normalize URL (remove query params, fragments, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Extract company name from domain
   */
  private extractCompanyFromDomain(domain: string): string {
    // Remove common TLDs and extract company name
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  }

  /**
   * Generate external ID
   */
  private generateExternalId(canonicalUrl: string): string {
    return `manual_${Buffer.from(canonicalUrl).toString('base64').substring(0, 32)}`;
  }
}

