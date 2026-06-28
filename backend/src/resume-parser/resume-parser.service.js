const PDFExtract = require('pdf.js-extract').PDFExtract;
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const aiProvider = require('../ai-services/ai-provider');

const pdfExtract = new PDFExtract();

class ResumeParserService {
  constructor() {
    this.uploadDir = process.env.LOCAL_STORAGE_PATH || './uploads/resumes';
    this.maxFileSize = 5 * 1024 * 1024;
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

  async parseResume(file) {
    try {
      this.validateFile(file);
      const text = await this.extractText(file);
      const parsedData = await aiProvider.parseResume(text);
      const filePath = await this.saveFile(file);
      return { parsedData, filePath, originalText: text };
    } catch (error) {
      console.error('Resume parsing error:', error);
      throw error;
    }
  }

  validateFile(file) {
    if (!file) throw new Error('No file uploaded');
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!this.supportedFormats.includes(fileExt)) {
      throw new Error(`Unsupported file format. Supported: ${this.supportedFormats.join(', ')}`);
    }
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
    }
  }

  async extractText(file) {
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

  async extractPDFText(buffer) {
    try {
      // Save buffer to temp file (pdf.js-extract requires file path)
      const tempPath = path.join(this.uploadDir, `temp-${Date.now()}.pdf`);
      await fs.writeFile(tempPath, buffer);
      
      // Extract text
      const data = await pdfExtract.extract(tempPath, {});
      
      // Delete temp file
      await fs.unlink(tempPath).catch(() => {});
      
      // Combine all text from all pages
      const text = data.pages
        .map(page => page.content.map(item => item.str).join(' '))
        .join('\n');
      
      return text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  async extractDOCXText(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to parse DOCX file');
    }
  }

  async saveFile(file) {
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

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('File deletion error:', error);
    }
  }
}

module.exports = new ResumeParserService();
