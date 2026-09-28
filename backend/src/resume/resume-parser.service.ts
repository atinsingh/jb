import { Injectable } from '@nestjs/common';
import { PDFExtract } from 'pdf.js-extract';
import * as mammoth from 'mammoth';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ResumeParserAIService } from '../llm/features/resume-parser-ai.service';

const pdfExtract = new PDFExtract();

@Injectable()
export class ResumeParserService {
  private uploadDir: string;
  private maxFileSize: number;
  private supportedFormats: string[];

  constructor(private resumeParserAIService: ResumeParserAIService) {
    this.uploadDir = process.env.LOCAL_STORAGE_PATH || './uploads/resumes';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.supportedFormats = ['.pdf', '.docx'];
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log('✅ Resume storage directory initialized');
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async parseResume(file: Express.Multer.File, userId: string, options: { fast?: boolean } = {}) {
    this.validateFile(file);
    const text = await this.extractText(file);

    // Compare imports use the deterministic parse immediately; their original
    // file is also reviewed by the agent later. Other imports retain best-effort
    // AI structuring with a deterministic fallback.
    const deterministicSections = this.heuristicParse(text);
    let parsedData: any;
    if (options.fast) {
      parsedData = deterministicSections;
    } else try {
      parsedData = await this.resumeParserAIService.parseResume(userId, text);
      const validExperience = Array.isArray(parsedData?.experience) && parsedData.experience.length > 0
        && parsedData.experience.every((entry: any) => String(entry?.title || '').trim() && String(entry?.company || '').trim());
      parsedData = {
        ...parsedData,
        ...(deterministicSections.summary && !parsedData?.summary?.trim()
          ? { summary: deterministicSections.summary } : {}),
        ...(deterministicSections.experience?.length && !validExperience
          ? { experience: deterministicSections.experience } : {}),
        ...(deterministicSections.education?.length && !parsedData?.education?.length
          ? { education: deterministicSections.education } : {}),
        ...(deterministicSections.skills?.length && !parsedData?.skills?.length
          ? { skills: deterministicSections.skills } : {}),
        achievements: deterministicSections.achievements || [],
        certifications: deterministicSections.certifications || [],
      };
    } catch (aiError: any) {
      console.warn(
        '[resume] AI parse unavailable, using heuristic fallback:',
        aiError?.message || aiError,
      );
      parsedData = deterministicSections;
    }

    // Compare Resume attaches the original to its own storage record next;
    // writing this temporary parser copy only duplicates I/O.
    const filePath = options.fast ? '' : await this.saveFile(file);
    return { parsedData, filePath, originalText: text };
  }

  /**
   * Deterministic, no-AI resume parse. Pulls out the high-signal fields
   * (name, email, phone, linkedin, summary, skills and sectioned entries) from
   * raw text. Only clearly delimited entries are emitted; the original file
   * remains authoritative when a layout cannot be parsed reliably.
   */
  heuristicParse(text: string) {
    const clean = (text || '').replace(/\r/g, '');
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

    // ---- contact ----
    const email = (clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
    const phoneCandidates: string[] = clean.match(/\+?\d[\d \t().-]{7,}\d/g) || [];
    const phone = phoneCandidates.find(value => !/^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/.test(value.trim()))?.trim() || '';
    const linkedin = (clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i) || [''])[0];
    const github = (clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+/i) || [''])[0];

    // ---- split the document into sections by detecting header lines ----
    const HEADERS: Record<string, string[]> = {
      summary: ['summary', 'professional summary', 'profile', 'profile summary', 'career objective', 'objective', 'about', 'about me'],
      experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history'],
      education: ['education', 'academic background', 'academics'],
      skills: ['skills', 'technical skills', 'core skills', 'key skills', 'core competencies', 'competencies', 'areas of expertise'],
      projects: ['projects', 'personal projects', 'selected projects'],
      certifications: ['certifications', 'certificates', 'licenses', 'licences'],
      achievements: ['achievements', 'accomplishments', 'awards', 'honors', 'honours'],
    };
    const headerOf = (line: string): string | null => {
      if (line.length > 45) return null;
      const norm = line.toLowerCase().replace(/[:•\-–—\s]+$/, '').trim();
      for (const key of Object.keys(HEADERS)) if (HEADERS[key].includes(norm)) return key;
      return null;
    };

    const sections: Record<string, string[]> = { _preamble: [] };
    let cur = '_preamble';
    for (const line of lines) {
      const h = headerOf(line);
      if (h) { cur = h; if (!sections[cur]) sections[cur] = []; }
      else sections[cur].push(line);
    }

    // ---- name & location from the preamble (before the first section) ----
    const pre = sections._preamble || [];
    let name = '';
    for (const l of pre) {
      if (l.includes('@') || /\d{3,}/.test(l) || /https?:|linkedin|github|\|/i.test(l)) continue;
      if (l.length > 60) continue;
      name = l;
      break;
    }
    let location = '';
    const contactLine = pre.find((l) => l.includes('@') || l.includes('|')) || '';
    for (const tok of contactLine.split(/\s*[|•]\s*/)) {
      const t = tok.trim();
      if (!t || t.includes('@') || /\d{3}/.test(t) || /https?:|linkedin|github|\.com/i.test(t)) continue;
      if (/^[A-Za-z][A-Za-z.,\s]{1,30}$/.test(t)) { location = t; break; }
    }

    // ---- summary ----
    const summary = (sections.summary || []).join(' ').trim();

    // ---- skills (strip "Category:" prefixes, split on delimiters) ----
    const skillSet: string[] = [];
    for (const raw of sections.skills || []) {
      let l = raw;
      const colon = l.indexOf(':');
      if (colon > 0 && colon <= 24 && !l.slice(0, colon).includes(',')) l = l.slice(colon + 1);
      for (const sk of l.split(/[,;|•·]+/)) {
        const v = sk.trim();
        if (v && v.length <= 40) skillSet.push(v);
      }
    }
    const skills = Array.from(new Set(skillSet));

    // ---- experience & education (grouped entries with dates + bullets) ----
    const experience = this.parseEntries(sections.experience || [], 'experience');
    const education = this.parseEntries(sections.education || [], 'education');
    const achievements = (sections.achievements || [])
      .map((line) => line.replace(/^[\u0088•·▪◦‣∙*-]\s*/, '').trim())
      .filter(Boolean);
    const certifications = (sections.certifications || [])
      .map((line) => ({ name: line.replace(/^[\u0088•·▪◦‣∙*-]\s*/, '').trim(), issuer: '' }))
      .filter((item) => item.name);

    return {
      name, fullName: name, email, phone, location, linkedin, github,
      summary, skills, experience, education, achievements, certifications, _source: 'heuristic',
    };
  }

  private isBullet(l: string): boolean {
    return /^[\u0088•·▪◦‣∙*]\s*/.test(l) || /^[-]\s+/.test(l);
  }

  private isDateLine(l: string): boolean {
    const hasYear = /\b(19|20)\d{2}\b/.test(l);
    const hasPresent = /\b(present|current|now)\b/i.test(l);
    return (hasYear || hasPresent) && l.length < 40 && /[–—-]|to|present|current/i.test(l);
  }

  private extractDateRange(text: string): { startDate: string; endDate: string; current: boolean; raw: string } {
    const M = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s*';
    const range = text.match(
      new RegExp(
        `(${M})?((?:19|20)\\d{2})\\s*(?:[–—-]|to)\\s*((${M})?(?:19|20)\\d{2}|present|current|now)`,
        'i',
      ),
    );
    if (range) {
      const isCur = /present|current|now/i.test(range[3]);
      return {
        startDate: ((range[1] || '') + range[2]).trim(),
        endDate: isCur ? 'Present' : range[3].trim(),
        current: isCur,
        raw: range[0],
      };
    }
    const single = text.match(/(?:19|20)\d{2}/);
    return single
      ? { startDate: single[0], endDate: '', current: false, raw: single[0] }
      : { startDate: '', endDate: '', current: false, raw: '' };
  }

  /** Group section lines without mistaking a wrapped bullet for a new job. */
  private parseEntries(sectionLines: string[], kind: 'experience' | 'education'): any[] {
    const groups: { headers: string[]; bullets: string[] }[] = [];
    let g: { headers: string[]; bullets: string[] } | null = null;
    for (const line of sectionLines) {
      if (this.isBullet(line)) {
        if (!g) g = { headers: [], bullets: [] };
        g.bullets.push(line.replace(/^[\u0088•·▪◦‣∙*-]\s*/, '').trim());
      } else if (kind === 'experience' && g && g.headers.some(header => this.extractDateRange(header).raw) && line.length > 80 && !this.extractDateRange(line).raw) {
        g.bullets.push(line);
      } else if (g && g.bullets.length > 0) {
        const isNextEntry = Boolean(this.extractDateRange(line).raw) && line.length < 150;
        if (isNextEntry) {
          groups.push(g);
          g = { headers: [line], bullets: [] };
        } else {
          const last = g.bullets.length - 1;
          const previous = g.bullets[last];
          g.bullets[last] = previous.endsWith('-') ? `${previous}${line}` : `${previous} ${line}`;
        }
      } else {
        if (!g) g = { headers: [], bullets: [] };
        g.headers.push(line);
      }
    }
    if (g) groups.push(g);

    return groups
      .map((grp) => {
        const { startDate, endDate, current, raw } = this.extractDateRange(grp.headers.join('  '));
        const headerLines = grp.headers.map((h) => h.replace(raw, '').replace(/[,|–—-]\s*$/, '').trim()).filter(Boolean);
        let full = headerLines.join('  ');
        if (raw) full = full.replace(raw, '');
        full = full.replace(/\s{2,}/g, ' ').replace(/[|,–—-]\s*$/, '').trim();

        if (kind === 'education') {
          const parts = headerLines.length === 2 ? headerLines : full.split(/\s*[–—|]\s*|\s+-\s+|\s+at\s+/i);
          const degree = (parts[0] || full).trim();
          const institution = parts.length >= 2 ? parts.slice(1).join(' ').trim() : '';
          return { degree, institution, location: '', startDate, endDate, description: '', dates: raw };
        }

        // experience: pull a trailing location, then split title / company
        let location = '';
        const locM = full.match(
          /[–—-]\s*(Remote|Hybrid|On-?site|[A-Z][A-Za-z.]+,\s*[A-Z]{2})\s*$/,
        );
        if (locM) { location = locM[1].trim(); full = full.slice(0, locM.index).trim(); }
        let title = full;
        let company = '';
        if (headerLines.length === 2 && !/[|–—]|\s+-\s+|\s+at\s/i.test(headerLines[0])) { title = headerLines[0]; company = headerLines[1]; }
        else if (/\s+at\s+/i.test(full)) { const p = full.split(/\s+at\s+/i); title = p[0]; company = p.slice(1).join(' at '); }
        else if (full.includes(', ')) { const p = full.split(', '); title = p[0]; company = p.slice(1).join(', '); }
        else if (/[–—|]|\s+-\s+/.test(full)) { const p = full.split(/\s*[–—|]\s*|\s+-\s+/); title = p[0]; company = p.slice(1).join(' '); }
        return {
          title: title.trim(), role: title.trim(), company: company.trim(), location,
          startDate, endDate, current, dates: raw,
          achievements: grp.bullets, bullets: grp.bullets, description: '',
        };
      })
      .filter((e: any) => (kind === 'education' ? e.degree || e.institution : e.title && e.company));
  }

  validateFile(file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!this.supportedFormats.includes(fileExt)) {
      throw new Error(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`);
    }
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
    }
  }

  async extractText(file: Express.Multer.File): Promise<string> {
    const fileExt = path.extname(file.originalname).toLowerCase();
    try {
      if (fileExt === '.pdf') return await this.extractPDFText(file.buffer);
      else if (fileExt === '.docx') return await this.extractDOCXText(file.buffer);
      throw new Error('Unsupported file type');
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to extract text from resume');
    }
  }

  async extractPDFText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfExtract.extractBuffer(buffer, {});
      return data.pages.map((page) => {
        const lines: Array<{ y: number; items: Array<{ x: number; str: string }> }> = [];
        for (const item of page.content) {
          if (!item.str?.trim()) continue;
          let line = lines.find((candidate) => Math.abs(candidate.y - item.y) < 2);
          if (!line) {
            line = { y: item.y, items: [] };
            lines.push(line);
          }
          line.items.push({ x: item.x, str: item.str });
        }
        return lines.sort((a, b) => a.y - b.y)
          .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim())
          .join('\n');
      }).join('\n');
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  async extractDOCXText(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to parse DOCX file');
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.originalname}`;
      const filePath = path.join(this.uploadDir, filename);
      await fs.writeFile(filePath, file.buffer);
      return filePath;
    } catch (error) {
      console.error('File save error:', error);
      throw new Error('Failed to save resume file');
    }
  }

  async deleteFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('File deletion error:', error);
    }
  }
}

