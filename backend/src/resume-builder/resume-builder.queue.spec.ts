import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { JwtService } from '@nestjs/jwt';
import { ResumeBuilderService } from './resume-builder.service';
import { ResumeBuilderPdfProcessor } from './resume-builder.pdf.processor';
import { QUEUE_PDF, JOB_GENERATE_PDF } from '../queue/queue.constants';
import { Resume } from '../schemas/resume.schema';
import { User } from '../schemas/user.schema';
import { ResumeVersion } from '../schemas/resume-version.schema';
import { ShareLink } from '../schemas/share-link.schema';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { StorageService } from '../storage';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';
import { HtmlSanitizerService } from '../ingestion/pipeline/html-sanitizer.service';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const USER_ID = '507f1f77bcf86cd799439011';
const RESUME_ID = 'r1';

const baseProviders = () => [
  { provide: getModelToken(Resume.name), useValue: {} },
  { provide: getModelToken(User.name), useValue: {} },
  { provide: getModelToken(ResumeVersion.name), useValue: {} },
  { provide: getModelToken(ShareLink.name), useValue: {} },
  {
    provide: LLMRoutingService,
    useValue: {
      getProviderForFeature: jest.fn(),
      getFeatureConfig: jest.fn(),
    },
  },
  // Dependencies added to ResumeBuilderService while this suite could not load.
  { provide: LLMQuotaService, useValue: { enforceQuota: jest.fn(), recordUsage: jest.fn() } },
  AtsParseabilityService,
  AtsMatchService,
  { provide: ResumeParserService, useValue: {} },
  { provide: JwtService, useValue: { sign: jest.fn() } },
  { provide: StorageService, useValue: {} },
  HtmlSanitizerService,
];

describe('ResumeBuilderService PDF producer (queue vs inline)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enqueues to Bull and returns the jobId when a queue is present', async () => {
    // Mocked Bull queue — the presence of this provider is what flips the
    // producer into "enqueue" mode (mirrors QUEUE_ENABLED=true).
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job1' }) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeBuilderService,
        { provide: getQueueToken(QUEUE_PDF), useValue: queue },
        ...baseProviders(),
      ],
    }).compile();

    const service = moduleRef.get(ResumeBuilderService);
    // Guard: it must NOT do the inline work when queued.
    const inlineSpy = jest
      .spyOn(service, 'generateAndPersistPdf')
      .mockResolvedValue({ pdfUrl: '/api/resume-builder/r1/pdf', pdfPath: 'k' });

    const result = await service.requestPdfGeneration(RESUME_ID, USER_ID);

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(JOB_GENERATE_PDF, {
      resumeId: RESUME_ID,
      userId: USER_ID,
    });
    expect(inlineSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      queued: true,
      jobId: 'job1',
      message: 'PDF generation queued',
    });
  });

  it('runs inline (calls generateAndPersistPdf) when the queue is absent', async () => {
    // No getQueueToken provider → @Optional() @InjectQueue resolves to undefined.
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ResumeBuilderService, ...baseProviders()],
    }).compile();

    const service = moduleRef.get(ResumeBuilderService);
    const inlineSpy = jest
      .spyOn(service, 'generateAndPersistPdf')
      .mockResolvedValue({ pdfUrl: '/api/resume-builder/r1/pdf', pdfPath: 'k' });

    const result = await service.requestPdfGeneration(RESUME_ID, USER_ID);

    expect(inlineSpy).toHaveBeenCalledWith(RESUME_ID, USER_ID);
    expect(result).toEqual({
      queued: false,
      pdfUrl: '/api/resume-builder/r1/pdf',
      message: 'PDF generated successfully',
    });
  });
});

describe('ResumeBuilderPdfProcessor', () => {
  it('calls generateAndPersistPdf with the job payload', async () => {
    const service = {
      generateAndPersistPdf: jest
        .fn()
        .mockResolvedValue({ pdfUrl: '/api/resume-builder/r1/pdf', pdfPath: 'k' }),
    } as unknown as ResumeBuilderService;

    const processor = new ResumeBuilderPdfProcessor(service);
    const job: any = { id: 'job1', data: { resumeId: RESUME_ID, userId: USER_ID } };

    const result = await processor.handleGenerate(job);

    expect(service.generateAndPersistPdf).toHaveBeenCalledWith(RESUME_ID, USER_ID);
    expect(result).toEqual({ pdfUrl: '/api/resume-builder/r1/pdf', pdfPath: 'k' });
  });
});
