import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ResumeBuilderService } from './resume-builder.service';
import { Resume } from '../schemas/resume.schema';
import { User } from '../schemas/user.schema';
import { ResumeVersion } from '../schemas/resume-version.schema';
import { ShareLink } from '../schemas/share-link.schema';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { StorageService } from '../storage';
import { HtmlSanitizerService } from '../ingestion/pipeline/html-sanitizer.service';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

// See resume-builder.generate.spec.ts — mocking one level up avoids the
// sanitize-html -> htmlparser2 ESM chain the jest transform cannot parse.
jest.mock('../ingestion/pipeline/html-sanitizer.service', () => ({
  HtmlSanitizerService: jest.fn().mockImplementation(() => ({
    sanitize: (html: any) => html,
  })),
}));

const USER_ID = '507f1f77bcf86cd799439011';

/**
 * "Save to library" for a generated résumé.
 *
 * Spec AC7 (2026-08-09-resume-generator-spec.md): a candidate who accepts a
 * generated résumé can save it, and what they saved is what gets stored —
 * including its provenance.
 *
 * This was completely broken. `CreateResumeDto` accepted only
 * {template, name, importFromProfile}, while the generate page posts
 * {name, role, jobDescription, tone, seniority, summary, experience, skills}
 * and no template. With `forbidNonWhitelisted: true` in main.ts that is a hard
 * 400 on every save — and the page's `.catch(() => {})` hid it, so the
 * candidate was navigated away as though it had worked.
 */
describe('ResumeBuilderService — saving a generated résumé', () => {
  let service: ResumeBuilderService;
  let created: any[];

  const GENERATED = {
    name: 'Senior Backend Engineer · Acme',
    summary: 'Backend engineer who has shipped payments infrastructure.',
    experience: [
      { title: 'Senior Backend Engineer', company: 'Acme Corp', startDate: '2021-03', description: 'Led the rewrite.' },
    ],
    skills: ['TypeScript', 'PostgreSQL'],
    targetRole: 'Senior Backend Engineer',
    source: 'generated' as const,
  };

  beforeEach(async () => {
    created = [];

    // `new this.resumeModel(doc)` must behave like a Mongoose document.
    const resumeModel: any = jest.fn().mockImplementation((doc: any) => {
      const record = { ...doc, _id: 'resume-1', save: jest.fn().mockResolvedValue({ ...doc, _id: 'resume-1' }) };
      created.push(record);
      return record;
    });
    resumeModel.find = jest.fn();
    resumeModel.findOne = jest.fn();
    resumeModel.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

    const userModel: any = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: USER_ID, name: 'Ada Lovelace', email: 'ada@example.com' }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeBuilderService,
        { provide: getModelToken(Resume.name), useValue: resumeModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(ResumeVersion.name), useValue: {} },
        { provide: getModelToken(ShareLink.name), useValue: {} },
        { provide: LLMRoutingService, useValue: {} },
        { provide: LLMQuotaService, useValue: {} },
        { provide: ResumeParserService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: StorageService, useValue: {} },
        HtmlSanitizerService,
        AtsParseabilityService,
        AtsMatchService,
      ],
    }).compile();

    service = moduleRef.get(ResumeBuilderService);
  });

  describe('AC7: the generated content survives the save', () => {
    it('persists the generated summary', async () => {
      await service.create(USER_ID, GENERATED as any);

      expect(created[0].summary).toBe(GENERATED.summary);
    });

    it('persists the generated experience entries', async () => {
      await service.create(USER_ID, GENERATED as any);

      expect(created[0].experience).toHaveLength(1);
      expect(created[0].experience[0].company).toBe('Acme Corp');
    });

    it('persists the generated skills', async () => {
      await service.create(USER_ID, GENERATED as any);

      expect(created[0].skills).toEqual(['TypeScript', 'PostgreSQL']);
    });

    it('records provenance so a generated résumé is auditable later', async () => {
      await service.create(USER_ID, GENERATED as any);

      expect(created[0].source).toBe('generated');
      expect(created[0].targetRole).toBe('Senior Backend Engineer');
    });

    // The generate page has no template picker, and template was required.
    it('does not require a template', async () => {
      await expect(service.create(USER_ID, GENERATED as any)).resolves.toBeDefined();
      expect(created[0].template).toBeTruthy();
    });
  });

  describe('existing behaviour is preserved', () => {
    it('still creates a blank résumé from a template alone', async () => {
      await service.create(USER_ID, { template: 'modern', name: 'Blank' } as any);

      expect(created[0].template).toBe('modern');
      expect(created[0].summary).toBeUndefined();
    });

    it('still imports from the user profile when asked', async () => {
      await service.create(USER_ID, { template: 'modern', importFromProfile: true } as any);

      expect(created[0].fullName).toBe('Ada Lovelace');
      expect(created[0].email).toBe('ada@example.com');
    });

    // Generated content must not silently override an explicit profile import.
    it('prefers explicitly supplied content over the profile import', async () => {
      await service.create(USER_ID, { ...GENERATED, importFromProfile: true } as any);

      expect(created[0].summary).toBe(GENERATED.summary);
    });
  });

  describe('scoring', () => {
    it('scores the résumé on creation so the library ring is never blank', async () => {
      await service.create(USER_ID, GENERATED as any);

      expect(typeof created[0].atsScore).toBe('number');
      expect(created[0].atsReport?.findings).toBeDefined();
    });
  });
});
