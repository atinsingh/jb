import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CandidateMaterialsService } from './candidate-materials.service';
import { Resume } from '../../schemas/resume.schema';
import { User } from '../../schemas/user.schema';
import { StorageService } from '../../storage/storage.service';
import { UsersService } from '../../users/users.service';

const USER_ID = '507f1f77bcf86cd799439011';

// Chainable query stub: findOne(...).sort(...).exec() -> row
const query = (row: any) => ({
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(row),
});

describe('CandidateMaterialsService', () => {
  let service: CandidateMaterialsService;

  const resumeModel = { findOne: jest.fn() };
  const userModel = { findById: jest.fn() };
  const storageService = { getBuffer: jest.fn() };
  const usersService = { getAutofillPayload: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateMaterialsService,
        { provide: getModelToken(Resume.name), useValue: resumeModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: StorageService, useValue: storageService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = moduleRef.get(CandidateMaterialsService);

    usersService.getAutofillPayload.mockResolvedValue({
      fullName: 'Ada Lovelace',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@x.com',
      phone: '+1 555 0100',
      location: 'London',
      linkedin: 'https://linkedin.com/in/ada',
      github: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('assembles basic identity fields + cover letter, and fetches résumé bytes via StorageService', async () => {
    resumeModel.findOne.mockReturnValue(
      query({ isPrimary: true, pdfPath: 'resumes/ada.pdf', name: 'Ada Resume' }),
    );
    const bytes = Buffer.from('%PDF-1.4 fake');
    storageService.getBuffer.mockResolvedValue(bytes);

    const materials = await service.assembleMaterials(USER_ID, {
      coverLetter: 'Dear hiring manager...',
    });

    expect(materials.fullName).toBe('Ada Lovelace');
    expect(materials.firstName).toBe('Ada');
    expect(materials.email).toBe('ada@x.com');
    expect(materials.phone).toBe('+1 555 0100');
    expect(materials.location).toBe('London');
    expect(materials.linkedin).toBe('https://linkedin.com/in/ada');
    expect(materials.coverLetter).toBe('Dear hiring manager...');

    expect(storageService.getBuffer).toHaveBeenCalledWith('resumes/ada.pdf');
    expect(materials.resumeBuffer).toBe(bytes);
    expect(materials.resumeFilename).toMatch(/\.pdf$/i);
  });

  it('falls back to pdfUrl when pdfPath is absent', async () => {
    resumeModel.findOne.mockReturnValue(
      query({ isPrimary: true, pdfUrl: 'https://cdn/x.pdf' }),
    );
    storageService.getBuffer.mockResolvedValue(Buffer.from('x'));

    await service.assembleMaterials(USER_ID, {});

    expect(storageService.getBuffer).toHaveBeenCalledWith('https://cdn/x.pdf');
  });

  it('leaves resumeBuffer undefined when there is no primary résumé (no throw)', async () => {
    resumeModel.findOne.mockReturnValue(query(null));

    const materials = await service.assembleMaterials(USER_ID, {});

    expect(storageService.getBuffer).not.toHaveBeenCalled();
    expect(materials.resumeBuffer).toBeUndefined();
    expect(materials.resumeFilename).toBeUndefined();
    // basic fields still assembled
    expect(materials.email).toBe('ada@x.com');
  });

  it('is defensive: a storage read failure does not throw and leaves resumeBuffer undefined', async () => {
    resumeModel.findOne.mockReturnValue(query({ pdfPath: 'resumes/broken.pdf' }));
    storageService.getBuffer.mockRejectedValue(new Error('S3 down'));
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);

    const materials = await service.assembleMaterials(USER_ID, {});

    expect(materials.resumeBuffer).toBeUndefined();
    expect(materials.fullName).toBe('Ada Lovelace');
  });

  it('is defensive: a null autofill payload does not throw', async () => {
    usersService.getAutofillPayload.mockResolvedValue(null);
    resumeModel.findOne.mockReturnValue(query(null));

    const materials = await service.assembleMaterials(USER_ID, {});

    expect(materials.fullName).toBeUndefined();
    expect(materials.resumeBuffer).toBeUndefined();
  });
});
