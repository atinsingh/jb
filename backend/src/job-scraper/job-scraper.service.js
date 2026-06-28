const cheerio = require('cheerio');
const axios = require('axios');

class JobScraperService {
  constructor() {
    this.maxJobsPerScrape = parseInt(process.env.MAX_JOBS_PER_SCRAPE) || 50;
    this.scrapingEnabled = process.env.JOB_SCRAPING_ENABLED !== 'false';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }

  async scrapeIndeed(keywords, location = '') {
    if (!this.scrapingEnabled) throw new Error('Job scraping is disabled');
    
    try {
      const query = keywords.join(' ');
      const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
      
      console.log(`🔍 Scraping Indeed for: ${query} in ${location || 'any location'}`);

      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      $('.job_seen_beacon, .jobsearch-ResultsList > li').each((index, element) => {
        if (jobs.length >= this.maxJobsPerScrape) return false;

        try {
          const $elem = $(element);
          const title = $elem.find('.jobTitle span, h2.jobTitle a').first().text().trim();
          const companyName = $elem.find('.companyName').first().text().trim();
          const location = $elem.find('.companyLocation').first().text().trim();
          const snippet = $elem.find('.job-snippet').text().trim();
          const jobKey = $elem.find('a[data-jk], h2 a').attr('data-jk') || $elem.find('a').attr('href')?.match(/jk=([^&]+)/)?.[1];
          
          if (title && companyName && jobKey) {
            jobs.push({
              title, companyName,
              location: location || 'Not specified',
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
        } catch (err) {
          console.error('Error parsing job element:', err.message);
        }
      });

      console.log(`✅ Scraped ${jobs.length} jobs from Indeed`);
      return jobs;
    } catch (error) {
      console.error('Indeed scraping error:', error.message);
      throw new Error('Failed to scrape Indeed jobs');
    }
  }

  async scrapeLinkedIn(keywords, location = '') {
    console.log('⚠️ LinkedIn scraping requires API access');
    return [];
  }

  async scrapeGlassdoor(keywords, location = '') {
    console.log('⚠️ Glassdoor scraping requires API access');
    return [];
  }

  async scrapeAllSources(keywords, location = '') {
    const results = [];
    try {
      const indeedJobs = await this.scrapeIndeed(keywords, location);
      results.push(...indeedJobs);
    } catch (error) {
      console.error('Multi-source scraping error:', error);
    }
    return results;
  }

  extractSkills(text) {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue',
      'TypeScript', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes',
      'Git', 'Agile', 'REST API', 'GraphQL', 'CI/CD', 'TDD', 'Microservices',
      'Machine Learning', 'Data Analysis', 'Leadership', 'Communication',
      'Project Management', 'Scrum', 'HTML', 'CSS', 'Express', 'FastAPI'
    ];
    const found = [];
    const lowerText = text.toLowerCase();
    for (const skill of commonSkills) {
      if (lowerText.includes(skill.toLowerCase())) found.push(skill);
    }
    return found;
  }

  removeDuplicates(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
      if (seen.has(job.externalId)) return false;
      seen.add(job.externalId);
      return true;
    });
  }
}

module.exports = new JobScraperService();
