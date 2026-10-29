import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service';
import { User } from '../schemas/user.schema';
import { AppLoggerService } from '../common/logger/logger.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const validConcierge = {
  published: true,
  headline: 'Hiring coach for engineers',
  bio: 'I have run engineering hiring loops for ten years and help candidates prepare for technical screens, system design and behavioural rounds.',
  specialties: ['System design'],
  yearsExperience: 10,
  hourlyRate: 150,
  languages: ['English'],
  timezone: 'America/Toronto',
  durations: [{ minutes: 60, url: 'https://calendly.com/coach/60' }],
};

describe('UsersService (concierge profile)', () => {
  let service: UsersService;

  const selectMock = jest.fn();
  const userModel: any = {
    findById: jest.fn(async () => ({ connectPayoutsEnabled: true })),
    findByIdAndUpdate: jest.fn(() => ({ select: selectMock })),
  };

  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
    selectMock.mockResolvedValue({ email: 'coach@x.io' });
  });

  afterEach(() => jest.clearAllMocks());

  it('rejects publishing a profile that is missing required fields', async () => {
    const incomplete = { ...validConcierge, bio: 'Too short to publish.' };

    await expect(
      service.updateProfile('user-1', { conciergeProfile: incomplete } as any),
    ).rejects.toThrow(BadRequestException);
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects publishing before payouts are enabled', async () => {
    userModel.findById.mockResolvedValueOnce({ connectPayoutsEnabled: false });
    await expect(
      service.updateProfile('user-1', { conciergeProfile: validConcierge } as any),
    ).rejects.toThrow(/Set up payouts/);
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('saves a complete published concierge profile as a whole object', async () => {
    await service.updateProfile('user-1', { conciergeProfile: validConcierge } as any);

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-1',
      { $set: { conciergeProfile: validConcierge } },
      expect.any(Object),
    );
  });

  it('rejects a duration link that is not Calendly or Google', async () => {
    await expect(service.updateProfile('user-1', {
      conciergeProfile: { ...validConcierge, durations: [{ minutes: 30, url: 'https://zoom.us/j/1' }] },
    } as any)).rejects.toThrow(/Calendly or Google/);
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  describe('UpdateProfileDto validation of conciergeProfile', () => {
    const toDto = (conciergeProfile: Record<string, unknown>) =>
      plainToInstance(UpdateProfileDto, { conciergeProfile });

    it('accepts a valid nested concierge profile', async () => {
      const errors = await validate(toDto(validConcierge));
      expect(errors).toHaveLength(0);
    });

    it('rejects an hourly rate below the minimum', async () => {
      const errors = await validate(toDto({ ...validConcierge, hourlyRate: 5 }));
      const nested = errors[0]?.children?.[0]?.property;
      expect(nested).toBe('hourlyRate');
    });

    it('rejects a headline longer than 120 characters', async () => {
      const errors = await validate(toDto({ ...validConcierge, headline: 'x'.repeat(121) }));
      const nested = errors[0]?.children?.[0]?.property;
      expect(nested).toBe('headline');
    });
  });
});
