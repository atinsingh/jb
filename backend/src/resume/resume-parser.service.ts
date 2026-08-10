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

  async parseResume(file: Express.Multer.File, userId: string) {
    this.validateFile(file);
    const text = await this.extractText(file);

    // AI structuring is best-effort. If the provider is unavailable (e.g. quota
    // exhausted / network), fall back to a deterministic heuristic parse so the
    // import still succeeds instead of hard-failing with a 500.
    let parsedData: any;
    try {
      parsedData = await this.resumeParserAIService.parseResume(userId, text);
    } catch (aiError: any) {
      console.warn(
        '[resume] AI parse unavailable, using heuristic fallback:',
        aiError?.message || aiError,
      );
      parsedData = this.heuristicParse(text);
    }

    const filePath = await this.saveFile(file);
    return { parsedData, filePath, originalText: text };
  }

  /**
   * Deterministic, no-AI resume parse. Pulls out the high-signal fields
   * (name, email, phone, linkedin, summary, skills) from the raw text using
   * regex + simple section detection. Experience is left to the AI path since
   * it can't be extracted reliably without a model.
   */
  heuristicParse(text: string) {
    const clean = (text || '').replace(/\r/g, '');
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

    // ---- contact ----
    const email = (clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
    const phone = (clean.match(/(\+?\d[\d\s().-]{7,}\d)/) || [''])[0].trim();
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

    return {
      name, fullName: name, email, phone, location, linkedin, github,
      summary, skills, experience, education, _source: 'heuristic',
    };
  }

  private isBullet(l: string): boolean {
    return /^[•·▪◦‣∙*]\s*/.test(l) || /^[-]\s+/.test(l);
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

  /** Group a section's lines into entries (header lines + bullet lines) and parse each. */
  private parseEntries(sectionLines: string[], kind: 'experience' | 'education'): any[] {
    const groups: { headers: string[]; bullets: string[] }[] = [];
    let g: { headers: string[]; bullets: string[] } | null = null;
    for (const line of sectionLines) {
      if (this.isBullet(line)) {
        if (!g) g = { headers: [], bullets: [] };
        g.bullets.push(line.replace(/^[•·▪◦‣∙*-]\s*/, '').trim());
      } else if (g && g.bullets.length > 0) {
        groups.push(g);
        g = { headers: [line], bullets: [] };
      } else {
        if (!g) g = { headers: [], bullets: [] };
        g.headers.push(line);
      }
    }
    if (g) groups.push(g);

    return groups
      .map((grp) => {
        const { startDate, endDate, current, raw } = this.extractDateRange(grp.headers.join('  '));
        let full = grp.headers.filter((h) => !this.isDateLine(h)).join('  ');
        if (raw) full = full.replace(raw, '');
        full = full.replace(/\s{2,}/g, ' ').replace(/[|,–—-]\s*$/, '').trim();

        if (kind === 'education') {
          const parts = full.split(/\s*[–—|]\s*|\s+at\s+/i);
          const degree = (parts[0] || full).trim();
          const institution = parts.length >= 2 ? parts.slice(1).join(' ').trim() : '';
          return { degree, institution, location: '', startDate, endDate, description: '', dates: raw };
        }

        // experience: pull a trailing location, then split title / company
        let location = '';
        const locM = full.match(
          /[–—-]\s*(Remote|Hybrid|On-?site|[A-Z][A-Za-z.]+(?:,?\s*[A-Z]{2})?(?:,\s*[A-Za-z]+)?)\s*$/,
        );
        if (locM) { location = locM[1].trim(); full = full.slice(0, locM.index).trim(); }
        let title = full;
        let company = '';
        if (/\s+at\s+/i.test(full)) { const p = full.split(/\s+at\s+/i); title = p[0]; company = p.slice(1).join(' at '); }
        else if (full.includes(', ')) { const p = full.split(', '); title = p[0]; company = p.slice(1).join(', '); }
        else if (/[–—|]/.test(full)) { const p = full.split(/\s*[–—|]\s*/); title = p[0]; company = p.slice(1).join(' '); }
        return {
          title: title.trim(), role: title.trim(), company: company.trim(), location,
          startDate, endDate, current, dates: raw,
          achievements: grp.bullets, bullets: grp.bullets, description: grp.bullets.join(' '),
        };
      })
      .filter((e: any) => (kind === 'education' ? e.degree || e.institution : e.title || e.company));
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
      const tempPath = path.join(this.uploadDir, `temp-${Date.now()}.pdf`);
      await fs.writeFile(tempPath, buffer);

      const data = await pdfExtract.extract(tempPath, {});

      await fs.unlink(tempPath).catch(() => {});

      const text = data.pages
        .map((page) => page.content.map((item) => item.str).join(' '))
        .join('\n');

      return text;
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

