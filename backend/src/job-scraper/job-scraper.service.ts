import { Injectable, BadRequestException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ScrapedJob {
  title: string;
  companyName: string;
  location: string;
  description: string;
  skills: string[];
  requirements: string[];
  salary: string;
  jobType: string;
  experience: string;
  source: string;
  externalUrl: string;
  externalId: string;
  isActive: boolean;
  scrapedAt: Date;
}

@Injectable()
export class JobScraperService {
  private maxJobsPerScrape: number;
  private scrapingEnabled: boolean;
  private userAgent: string;

  constructor() {
    this.maxJobsPerScrape = parseInt(process.env.MAX_JOBS_PER_SCRAPE || '50', 10);
    this.scrapingEnabled = process.env.JOB_SCRAPING_ENABLED !== 'false';
    this.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  async scrapeIndeed(
    keywords: string[],
    location: string = '',
  ): Promise<ScrapedJob[]> {
    if (!this.scrapingEnabled) {
      throw new BadRequestException('Job scraping is disabled');
    }

    try {
      const query = keywords.join(' ');
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;

      console.log(
        `🔍 Scraping Indeed for: ${query} in ${location || 'any location'}`,
      );

      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const jobs: ScrapedJob[] = [];

      $('.job_seen_beacon, .jobsearch-ResultsList > li').each(
        (index, element) => {
          if (jobs.length >= this.maxJobsPerScrape) return false;

          try {
            const $elem = $(element);
            const title = $elem
              .find('.jobTitle span, h2.jobTitle a')
              .first()
              .text()
              .trim();
            const companyName = $elem.find('.companyName').first().text().trim();
            const locationText = $elem.find('.companyLocation').first().text().trim();
            const snippet = $elem.find('.job-snippet').text().trim();
            const jobKey =
              $elem.find('a[data-jk], h2 a').attr('data-jk') ||
              $elem
                .find('a')
                .attr('href')
                ?.match(/jk=([^&]+)/)?.[1];

            if (title && companyName && jobKey) {
              jobs.push({
                title,
                companyName,
                location: locationText || 'Not specified',
                description: snippet || 'No description available',
                skills: this.extractSkills(title + ' ' + snippet),
                requirements: [],
                salary: 'Not specified',
                jobType: 'Full-time',
                experience: 'Not specified',
                source: 'Indeed',
                externalUrl: `https://www.indeed.com/viewjob?jk=${jobKey}`,
                externalId: `indeed_${jobKey}`,
                isActive: true,
                scrapedAt: new Date(),
              });
            }
          } catch (err: any) {
            console.error('Error parsing job element:', err.message);
          }
        },
      );

      console.log(`✅ Scraped ${jobs.length} jobs from Indeed`);
      return jobs;
    } catch (error: any) {
      console.error('Indeed scraping error:', error.message);
      throw new BadRequestException('Failed to scrape Indeed jobs');
    }
  }

  async scrapeLinkedIn(keywords: string[], location: string = ''): Promise<ScrapedJob[]> {
    console.log('⚠️ LinkedIn scraping requires API access');
    return [];
  }

  async scrapeGlassdoor(keywords: string[], location: string = ''): Promise<ScrapedJob[]> {
    console.log('⚠️ Glassdoor scraping requires API access');
    return [];
  }

  async scrapeAllSources(
    keywords: string[],
    location: string = '',
  ): Promise<ScrapedJob[]> {
    const results: ScrapedJob[] = [];
    try {
      const indeedJobs = await this.scrapeIndeed(keywords, location);
      results.push(...indeedJobs);
    } catch (error) {
      console.error('Multi-source scraping error:', error);
    }
    return results;
  }

  extractSkills(text: string): string[] {
    const commonSkills = [
      'JavaScript',
      'Python',
      'Java',
      'React',
      'Node.js',
      'Angular',
      'Vue',
      'TypeScript',
      'SQL',
      'MongoDB',
      'PostgreSQL',
      'AWS',
      'Docker',
      'Kubernetes',
      'Git',
      'Agile',
      'REST API',
      'GraphQL',
      'CI/CD',
      'TDD',
      'Microservices',
      'Machine Learning',
      'Data Analysis',
      'Leadership',
      'Communication',
      'Project Management',
      'Scrum',
      'HTML',
      'CSS',
      'Express',
      'FastAPI',
    ];
    const found: string[] = [];
    const lowerText = text.toLowerCase();
    for (const skill of commonSkills) {
      if (lowerText.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    }
    return found;
  }

  removeDuplicates(jobs: ScrapedJob[]): ScrapedJob[] {
    const seen = new Set<string>();
    return jobs.filter((job) => {
      if (seen.has(job.externalId)) {
        return false;
      }
      seen.add(job.externalId);
      return true;
    });
  }
}

