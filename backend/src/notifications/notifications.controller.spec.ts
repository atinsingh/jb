import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const service = {
    list: jest.fn(),
    markAllRead: jest.fn(),
    markRead: jest.fn(),
  };

  const req = { user: { _id: 'user1' } };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();

    controller = moduleRef.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('list -> passes derived userId and type through', async () => {
    service.list.mockResolvedValue({ notifications: [], unread: 0 });

    const result = await controller.list('matches', req);

    expect(service.list).toHaveBeenCalledWith('user1', 'matches');
    expect(result).toEqual({ notifications: [], unread: 0 });
  });

  it('readAll -> delegates with derived userId', async () => {
    service.markAllRead.mockResolvedValue({ unread: 0 });

    const result = await controller.readAll(req);

    expect(service.markAllRead).toHaveBeenCalledWith('user1');
    expect(result).toEqual({ unread: 0 });
  });

  it('markRead -> delegates with userId and id', async () => {
    service.markRead.mockResolvedValue({ _id: 'c1', read: true });

    const result = await controller.markRead('c1', req);

    expect(service.markRead).toHaveBeenCalledWith('user1', 'c1');
    expect(result).toEqual({ _id: 'c1', read: true });
  });
});
