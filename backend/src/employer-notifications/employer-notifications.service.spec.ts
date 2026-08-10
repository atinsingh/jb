import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmployerNotificationsService } from './employer-notifications.service';
import { EmployerNotification } from './schemas/employer-notification.schema';

describe('EmployerNotificationsService (create)', () => {
  let service: EmployerNotificationsService;

  const model = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerNotificationsService,
        { provide: getModelToken(EmployerNotification.name), useValue: model },
      ],
    }).compile();

    service = moduleRef.get<EmployerNotificationsService>(
      EmployerNotificationsService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('writes a notification with all provided fields', async () => {
    const doc = { _id: 'e1' };
    model.create.mockResolvedValue(doc);

    const result = await service.create({
      ownerId: 'owner1',
      type: 'applicants',
      text: 'New applicant',
      href: '/x',
      tag: 'AB',
      ai: true,
      group: 'earlier',
    });

    expect(model.create).toHaveBeenCalledWith({
      ownerId: 'owner1',
      type: 'applicants',
      text: 'New applicant',
      href: '/x',
      tag: 'AB',
      ai: true,
      group: 'earlier',
    });
    expect(result).toBe(doc);
  });

  it('applies defaults for optional fields', async () => {
    model.create.mockResolvedValue({ _id: 'e2' });

    await service.create({
      ownerId: 'owner1',
      type: 'offers',
      text: 'Offer sent',
    });

    expect(model.create).toHaveBeenCalledWith({
      ownerId: 'owner1',
      type: 'offers',
      text: 'Offer sent',
      href: '',
      tag: '',
      ai: false,
      group: 'today',
    });
  });
});
