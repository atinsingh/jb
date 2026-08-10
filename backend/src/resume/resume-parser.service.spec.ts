import { ResumeParserService } from './resume-parser.service';

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
    expect(result.parsedData).toEqual({ name: 'Jane', skills: ['ts'] });
    expect(result.originalText).toBe('raw resume text');
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
});
