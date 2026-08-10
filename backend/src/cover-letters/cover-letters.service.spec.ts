import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CoverLettersService } from './cover-letters.service';
import { CoverLetter } from '../schemas/cover-letter.schema';
import { User } from '../schemas/user.schema';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { StorageService } from '../storage';

const USER_ID = '507f1f77bcf86cd799439011';

describe('CoverLettersService (storage migration)', () => {
  let service: CoverLettersService;

  const storage = {
    put: jest.fn().mockResolvedValue({ key: 'k', url: '/uploads/k' }),
    getBuffer: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn(),
    getDriverName: jest.fn(() => 'local'),
  };

  const coverLetterModel = {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(),
  };

  const mockProvider = { chat: jest.fn(), getName: () => 'mock', isAvailable: () => true };
  const routing = {
    getProviderForFeature: jest.fn(() => mockProvider),
    getFeatureConfig: jest.fn(() => ({
      model: 'gpt-4o-mini',
      provider: 'mock',
      temperature: 0.7,
      maxTokens: 1000,
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLettersService,
        { provide: getModelToken(CoverLetter.name), useValue: coverLetterModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: LLMRoutingService, useValue: routing },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get<CoverLettersService>(CoverLettersService);
  });

  describe('generateCoverLetterWithTemplate (llm migration)', () => {
    const candidateInfo = { name: 'Jane', skills: ['ts'], experience: [], summary: 'dev' };
    const jobInfo = { title: 'Engineer', companyName: 'Acme', description: 'build' };

    it('routes through LLMRoutingService.getProviderForFeature and returns provider content', async () => {
      mockProvider.chat.mockResolvedValue({ content: '  Dear Acme, hire me.  ' });

      const result = await (service as any).generateCoverLetterWithTemplate(
        candidateInfo,
        jobInfo,
        'professional',
      );

      expect(routing.getProviderForFeature).toHaveBeenCalled();
      expect(mockProvider.chat).toHaveBeenCalledTimes(1);
      expect(result).toBe('Dear Acme, hire me.');
    });

    it('falls back to composeFallbackCoverLetter when the provider throws', async () => {
      mockProvider.chat.mockRejectedValue(new Error('provider down'));

      const result = await (service as any).generateCoverLetterWithTemplate(
        candidateInfo,
        jobInfo,
        'professional',
      );

      expect(result).toContain('Dear Hiring Team at Acme');
      expect(result).toContain('Jane');
    });
  });

  describe('generatePDF', () => {
    it('puts the pdf-lib bytes under cover-letters/<id>.pdf and returns the key', async () => {
      const coverLetter: any = {
        _id: 'cl1',
        companyName: 'Acme',
        content: 'Dear Hiring Manager, hello world.',
      };
      const user: any = { name: 'Jane Doe' };

      const key = await (service as any).generatePDF(coverLetter, user);

      expect(storage.put).toHaveBeenCalledTimes(1);
      const [putKey, buf, opts] = storage.put.mock.calls[0];
      expect(putKey).toBe('cover-letters/cl1.pdf');
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(opts).toEqual({ contentType: 'application/pdf' });
      expect(key).toBe('cover-letters/cl1.pdf');
    });
  });

  describe('getPDFPath (lazy generate)', () => {
    it('generates + persists key and pdfUrl when absent', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const coverLetter: any = { _id: 'cl2', pdfPath: undefined, save };
      coverLetterModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(coverLetter),
      });
      userModel.findById.mockReturnValue({
        exec: () => Promise.resolve({ name: 'Jane' }),
      });
      jest
        .spyOn(service as any, 'generatePDF')
        .mockResolvedValue('cover-letters/cl2.pdf');

      const result = await service.getPDFPath('cl2', USER_ID);

      expect(coverLetter.pdfPath).toBe('cover-letters/cl2.pdf');
      expect(coverLetter.pdfUrl).toBe('/api/cover-letters/cl2/pdf');
      expect(save).toHaveBeenCalled();
      expect(result).toBe('cover-letters/cl2.pdf');
    });
  });

  describe('delete', () => {
    it('deletes the stored PDF object by key and removes the doc', async () => {
      const coverLetter: any = { _id: 'cl3', pdfPath: 'cover-letters/cl3.pdf' };
      coverLetterModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(coverLetter),
      });
      coverLetterModel.deleteOne.mockReturnValue({ exec: () => Promise.resolve({}) });

      await service.delete('cl3', USER_ID);

      expect(storage.delete).toHaveBeenCalledWith('cover-letters/cl3.pdf');
      expect(coverLetterModel.deleteOne).toHaveBeenCalledWith({ _id: 'cl3' });
    });
  });
});
