import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CandidateMaterialsService } from './candidate-materials.service';
import { Resume } from '../../schemas/resume.schema';
import {
  ApplicationArtifact,
  ArtifactType,
} from '../../schemas/application-artifact.schema';
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
  const artifactModel = { findOne: jest.fn() };
  const userModel = { findById: jest.fn() };
  const storageService = { getBuffer: jest.fn() };
  const usersService = { getAutofillPayload: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateMaterialsService,
        { provide: getModelToken(Resume.name), useValue: resumeModel },
        {
          provide: getModelToken(ApplicationArtifact.name),
          useValue: artifactModel,
        },
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

  it('assembles identity fields and fetches only the application\'s snapshotted résumé artifact', async () => {
    const applicationId = '64b000000000000000000010';
    const artifactId = '64b000000000000000000011';
    artifactModel.findOne.mockReturnValue(
      query({
        _id: artifactId,
        applicationId,
        userId: USER_ID,
        type: ArtifactType.RESUME_VERSION,
        fileUrl: 'applications/exact-ada-v7.pdf',
        fileName: 'Ada Resume.pdf',
        version: 7,
        isActive: true,
      }),
    );
    const bytes = Buffer.from('%PDF-1.4 fake');
    storageService.getBuffer.mockResolvedValue(bytes);

    const materials = await service.assembleMaterials(USER_ID, {
      _id: applicationId,
      coverLetter: 'Dear hiring manager...',
      artifacts: { resumeVersionId: artifactId },
    });

    expect(materials.fullName).toBe('Ada Lovelace');
    expect(materials.firstName).toBe('Ada');
    expect(materials.email).toBe('ada@x.com');
    expect(materials.phone).toBe('+1 555 0100');
    expect(materials.location).toBe('London');
    expect(materials.linkedin).toBe('https://linkedin.com/in/ada');
    expect(materials.coverLetter).toBe('Dear hiring manager...');

    expect(artifactModel.findOne).toHaveBeenCalledWith({
      _id: expect.anything(),
      applicationId: expect.anything(),
      userId: expect.anything(),
      type: ArtifactType.RESUME_VERSION,
    });
    expect(storageService.getBuffer).toHaveBeenCalledWith(
      'applications/exact-ada-v7.pdf',
    );
    expect(materials.resumeBuffer).toBe(bytes);
    expect(materials.resumeFilename).toBe('Ada Resume.pdf');
    expect(resumeModel.findOne).not.toHaveBeenCalled();
  });

  it('does not fall back to the candidate\'s current primary résumé', async () => {
    artifactModel.findOne.mockReturnValue(query(null));

    const materials = await service.assembleMaterials(USER_ID, {
      _id: '64b000000000000000000010',
    });

    expect(storageService.getBuffer).not.toHaveBeenCalled();
    expect(resumeModel.findOne).not.toHaveBeenCalled();
    expect(materials.resumeBuffer).toBeUndefined();
    expect(materials.resumeFilename).toBeUndefined();
    // basic fields still assembled
    expect(materials.email).toBe('ada@x.com');
  });

  it('is defensive: a storage read failure does not throw and leaves resumeBuffer undefined', async () => {
    artifactModel.findOne.mockReturnValue(
      query({ fileUrl: 'applications/broken.pdf', fileName: 'Resume.pdf' }),
    );
    storageService.getBuffer.mockRejectedValue(new Error('S3 down'));
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);

    const materials = await service.assembleMaterials(USER_ID, {
      _id: '64b000000000000000000010',
      artifacts: { resumeVersionId: '64b000000000000000000011' },
    });

    expect(materials.resumeBuffer).toBeUndefined();
    expect(materials.fullName).toBe('Ada Lovelace');
  });

  it('is defensive: a null autofill payload does not throw', async () => {
    usersService.getAutofillPayload.mockResolvedValue(null);
    artifactModel.findOne.mockReturnValue(query(null));

    const materials = await service.assembleMaterials(USER_ID, {
      _id: '64b000000000000000000010',
    });

    expect(materials.fullName).toBeUndefined();
    expect(materials.resumeBuffer).toBeUndefined();
  });
});
