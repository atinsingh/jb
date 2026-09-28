import { ResumeParserService } from './resume-parser.service';
import { PDFExtract } from 'pdf.js-extract';

const USER_ID = 'user123';

const fakeFile = {
  originalname: 'resume.pdf',
  size: 1024,
  buffer: Buffer.from('pdf'),
} as any;

describe('ResumeParserService (llm migration)', () => {
  let service: ResumeParserService;
  let aiParser: { parseResume: jest.Mock };

  beforeEach(() => {
    aiParser = { parseResume: jest.fn() };
    // The constructor fires initializeStorage() (fs.mkdir + console.log) async;
    // stub it so nothing logs after the test file completes.
    jest
      .spyOn(ResumeParserService.prototype, 'initializeStorage')
      .mockResolvedValue(undefined);
    service = new ResumeParserService(aiParser as any);
    // Avoid real filesystem work.
    jest.spyOn(service, 'extractText').mockResolvedValue('raw resume text');
    jest.spyOn(service, 'saveFile').mockResolvedValue('/tmp/resume.pdf');
  });

  it('calls ResumeParserAIService.parseResume with the threaded userId + text', async () => {
    aiParser.parseResume.mockResolvedValue({ name: 'Jane', skills: ['ts'] });

    const result = await service.parseResume(fakeFile, USER_ID);

    expect(aiParser.parseResume).toHaveBeenCalledWith(USER_ID, 'raw resume text');
    expect(result.parsedData).toEqual({
      name: 'Jane',
      skills: ['ts'],
      achievements: [],
      certifications: [],
    });
    expect(result.originalText).toBe('raw resume text');
  });

  it('keeps standalone achievements and certifications alongside an AI parse', async () => {
    aiParser.parseResume.mockResolvedValue({ name: 'Jane', skills: ['ts'] });
    jest.spyOn(service, 'heuristicParse').mockReturnValue({
      achievements: ['Spoke at NodeConf'],
      certifications: [{ name: 'AWS Certified' }],
      _source: 'heuristic',
    } as any);

    const result = await service.parseResume(fakeFile, USER_ID);

    expect(result.parsedData).toEqual({
      name: 'Jane',
      skills: ['ts'],
      achievements: ['Spoke at NodeConf'],
      certifications: [{ name: 'AWS Certified' }],
    });
  });

  it('falls back to the deterministic heuristicParse when the AI parser throws', async () => {
    aiParser.parseResume.mockRejectedValue(new Error('quota exhausted'));
    const heuristicSpy = jest
      .spyOn(service, 'heuristicParse')
      .mockReturnValue({ _source: 'heuristic' } as any);

    const result = await service.parseResume(fakeFile, USER_ID);

    expect(heuristicSpy).toHaveBeenCalledWith('raw resume text');
    expect(result.parsedData).toEqual({ _source: 'heuristic' });
  });

  it('keeps clearly extracted professional sections when the AI parse returns contact fields only', async () => {
    (service.extractText as jest.Mock).mockResolvedValue('John Doe\njohn.doe@example.com\nSummary\nDeveloper with Kubernetes experience\nExperience\nSoftware Engineer | Example Co Jan 2026 – Present\n• Deployed 8 Kubernetes services');
    aiParser.parseResume.mockResolvedValue({ name: 'John Doe', email: 'john.doe@example.com', summary: '', experience: [] });

    const result = await service.parseResume(fakeFile, USER_ID);

    expect(result.parsedData.summary).toContain('Kubernetes experience');
    expect(result.parsedData.experience).toEqual(expect.arrayContaining([
      expect.objectContaining({ achievements: expect.arrayContaining(['Deployed 8 Kubernetes services']) }),
    ]));
  });

  it('preserves PDF section lines so a heuristic import cannot collapse to contact details', async () => {
    jest.spyOn(PDFExtract.prototype, 'extractBuffer').mockResolvedValue({ pages: [{ content: [
      { str: 'John Doe', x: 50, y: 68 },
      { str: 'john.doe@example.com', x: 50, y: 116 },
      { str: 'Summary', x: 50, y: 149 },
      { str: 'Developer with Kubernetes experience', x: 50, y: 168 },
      { str: 'Experience', x: 50, y: 222 },
      { str: 'Software Engineer | Example Co', x: 50, y: 240 },
      { str: 'Deployed 8 containerised services', x: 50, y: 266 },
    ] }] } as any);

    const text = await service.extractPDFText(Buffer.from('pdf'));
    expect(text).toContain('Summary\nDeveloper with Kubernetes experience\nExperience\nSoftware Engineer | Example Co');
    expect(service.heuristicParse(text).summary).toContain('Kubernetes');
    expect(service.heuristicParse(text).experience).toHaveLength(1);
  });

  it('keeps wrapped PDF bullets inside their three work-history entries', () => {
    const parsed = service.heuristicParse([
      'John Doe', 'Summary', 'Developer building containerised services.', 'Experience',
      'Software Engineer | Example Co Jan 2026 – Present',
      '• Deployed 8 containerised services across Kubernetes clusters; shipped',
      'white-label mobile app in React Native.',
      'Full Stack Developer | Example Bank May 2025 – Aug 2025',
      '• Built Selenium automation across 3 workflows, reducing',
      'QA cycle time by 50%.',
      'Full Stack Developer | Example Trading Club Aug 2024 – Dec 2024',
      '• Developed Express backend with 10+ entities.',
    ].join('\n'));

    expect(parsed.experience).toHaveLength(3);
    expect(parsed.experience.map((entry) => entry.company)).toEqual(['Example Co', 'Example Bank', 'Example Trading Club']);
    expect(parsed.experience[0].achievements[0]).toContain('white-label mobile app');
    expect(parsed.experience[1].achievements[0]).toContain('QA cycle time by 50%');
    expect(parsed.experience[0].description).toBe('');
  });

  it('parses comparison imports without a second model call', async () => {
    (service.extractText as jest.Mock).mockResolvedValue('John Doe\nSummary\nDeveloper building containerised services.\nExperience\nSoftware Engineer | Example Co Jan 2026 – Present\n• Deployed 8 services.');
    const result = await service.parseResume(fakeFile, USER_ID, { fast: true });
    expect(aiParser.parseResume).not.toHaveBeenCalled();
    expect(service.saveFile).not.toHaveBeenCalled();
    expect(result.parsedData.summary).toContain('containerised services');
    expect(result.parsedData.experience[0].company).toBe('Example Co');
  });
});
