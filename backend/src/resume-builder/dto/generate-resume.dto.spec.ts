import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateResumeDto, GenerateSectionDto } from './generate-resume.dto';

// These exercise the class-validator decorators directly (the same engine
// the app's global ValidationPipe uses at runtime — see main.ts's
// `whitelist: true, forbidNonWhitelisted: true, transform: true`), without
// needing to boot Nest's HTTP layer.

describe('GenerateResumeDto', () => {
  it('accepts a minimal valid payload (role only)', async () => {
    const dto = plainToInstance(GenerateResumeDto, { role: 'Senior Engineer' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts the full frontend payload shape', async () => {
    const dto = plainToInstance(GenerateResumeDto, {
      role: 'Senior Product Designer',
      jobDescription: 'Own end-to-end design for the checkout funnel.',
      source: 'profile',
      tone: 'confident',
      seniority: 'senior',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing role', async () => {
    const dto = plainToInstance(GenerateResumeDto, { jobDescription: 'x' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejects an empty-string role', async () => {
    const dto = plainToInstance(GenerateResumeDto, { role: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  // Security consideration from the spec: jobDescription is untrusted free
  // text going into a prompt and must have a bounded length.
  it('rejects a jobDescription over the length bound', async () => {
    const dto = plainToInstance(GenerateResumeDto, {
      role: 'Engineer',
      jobDescription: 'x'.repeat(8001),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'jobDescription')).toBe(true);
  });

  it('accepts a jobDescription right at the length bound', async () => {
    const dto = plainToInstance(GenerateResumeDto, {
      role: 'Engineer',
      jobDescription: 'x'.repeat(8000),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an unrecognised source value', async () => {
    const dto = plainToInstance(GenerateResumeDto, { role: 'Engineer', source: 'telepathy' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'source')).toBe(true);
  });
});

describe('GenerateSectionDto', () => {
  it.each(['summary', 'experience', 'skills'])('accepts section=%s with no other fields', async (section) => {
    const dto = plainToInstance(GenerateSectionDto, { section });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a section outside the supported set', async () => {
    const dto = plainToInstance(GenerateSectionDto, { section: 'education' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'section')).toBe(true);
  });

  it('rejects a missing section', async () => {
    const dto = plainToInstance(GenerateSectionDto, { role: 'Engineer' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'section')).toBe(true);
  });

  it('accepts the full frontend payload shape', async () => {
    const dto = plainToInstance(GenerateSectionDto, {
      section: 'experience',
      role: 'Engineer',
      jobDescription: 'Backend role',
      tone: 'confident',
      seniority: 'senior',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an oversized jobDescription', async () => {
    const dto = plainToInstance(GenerateSectionDto, {
      section: 'summary',
      jobDescription: 'x'.repeat(8001),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'jobDescription')).toBe(true);
  });
});
