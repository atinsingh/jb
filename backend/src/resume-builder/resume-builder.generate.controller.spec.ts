import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';
import { StorageService } from '../storage';

// resume-builder.service (imported transitively via ResumeBuilderController)
// pulls in uuid (ESM) and, through HtmlSanitizerService, sanitize-html (also
// unparseable by the repo's jest transform — see resume-builder.generate.spec.ts
// for the full explanation). Both are mocked the same way the pre-existing
// resume-builder.controller.spec.ts already mocks uuid.
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
describe('ResumeBuilderController — generate routes', () => {
  let controller: ResumeBuilderController;

  const service = {
    generate: jest.fn(),
    generateSection: jest.fn(),
  };
  const storage = {};
  const req = { user: { _id: 'u1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ResumeBuilderController],
      providers: [
        { provide: ResumeBuilderService, useValue: service },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    controller = moduleRef.get<ResumeBuilderController>(ResumeBuilderController);
  });

  describe('POST generate', () => {
    it('delegates to service.generate with the authenticated userId and the DTO, returning its result as-is', async () => {
      const dto: any = {
        role: 'Engineer',
        jobDescription: 'JD',
        source: 'profile',
        tone: 'confident',
        seniority: 'senior',
      };
      const expected = { id: 'g1', summary: 's', experience: [], skills: [], keywords: [], coverage: {} };
      service.generate.mockResolvedValue(expected);

      const result = await controller.generate(dto, req);

      expect(service.generate).toHaveBeenCalledWith('u1', dto);
      expect(result).toBe(expected);
    });

    it('propagates a BadRequestException from the service (AC8) unchanged', async () => {
      service.generate.mockRejectedValue(
        new BadRequestException('Add your work experience to your profile or a résumé first.'),
      );

      await expect(controller.generate({ role: 'Engineer' } as any, req)).rejects.toThrow(
        'Add your work experience to your profile or a résumé first.',
      );
    });
  });

  describe('POST generate/section', () => {
    it('delegates to service.generateSection and returns its { content } shape untouched', async () => {
      const dto: any = { section: 'summary', role: 'Engineer' };
      const expected = { content: 'a summary' };
      service.generateSection.mockResolvedValue(expected);

      const result = await controller.generateSection(dto, req);

      expect(service.generateSection).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual({ content: 'a summary' });
    });

    it('passes through a string content payload (section=summary) as well as an array payload (section=experience/skills)', async () => {
      service.generateSection.mockResolvedValueOnce({ content: 'a summary' });
      await expect(controller.generateSection({ section: 'summary' } as any, req)).resolves.toEqual({
        content: 'a summary',
      });

      service.generateSection.mockResolvedValueOnce({ content: ['bullet one', 'bullet two'] });
      await expect(controller.generateSection({ section: 'experience' } as any, req)).resolves.toEqual({
        content: ['bullet one', 'bullet two'],
      });
    });
  });

  // Structural requirement called out explicitly by the spec: the two new
  // collection-level routes must be declared before any `:id`-prefixed route
  // in the controller source, or Nest/Express's parameterised matching would
  // treat "generate" as an :id value. Nest's testing module does not perform
  // real Express route resolution, so this is verified directly against the
  // controller source's declaration order rather than through a live request.
  it('declares POST generate and POST generate/section before any :id-prefixed route', () => {
    const source = fs.readFileSync(path.join(__dirname, 'resume-builder.controller.ts'), 'utf8');

    const generateIdx = source.indexOf("@Post('generate')");
    const generateSectionIdx = source.indexOf("@Post('generate/section')");
    // Match only actual route decorators taking a ':id...' path (not prose
    // in a comment that happens to mention ':id') — e.g. @Get(':id/pdf'),
    // @Post(':id/duplicate'), @Patch(':id'), @Delete(':id').
    const idRouteRe = /@(Get|Post|Patch|Delete)\(\s*':id/;
    const idRouteMatch = idRouteRe.exec(source);

    expect(generateIdx).toBeGreaterThan(-1);
    expect(generateSectionIdx).toBeGreaterThan(-1);
    expect(idRouteMatch).not.toBeNull();
    const firstIdRouteIdx = idRouteMatch!.index;
    expect(generateIdx).toBeLessThan(firstIdRouteIdx);
    expect(generateSectionIdx).toBeLessThan(firstIdRouteIdx);
  });
});
