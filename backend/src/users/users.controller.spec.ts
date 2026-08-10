import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageService } from '../storage';

describe('UsersController.updateProfilePicture (storage migration)', () => {
  let controller: UsersController;

  const usersService = {
    updateProfilePicture: jest.fn(),
  };
  const storage = {
    put: jest.fn(),
  };

  const req = { user: { _id: 'u1', email: 'a@b.com' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    controller = moduleRef.get<UsersController>(UsersController);
  });

  it('puts the avatar under avatars/<userId><ext> and persists the served url', async () => {
    const file: any = {
      originalname: 'me.PNG',
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
    };
    storage.put.mockResolvedValue({ key: 'avatars/u1.png', url: '/uploads/avatars/u1.png' });
    usersService.updateProfilePicture.mockResolvedValue({ id: 'u1', picture: '/uploads/avatars/u1.png' });

    const result = await controller.updateProfilePicture(file, req);

    expect(storage.put).toHaveBeenCalledWith('avatars/u1.png', file.buffer, {
      contentType: 'image/png',
    });
    expect(usersService.updateProfilePicture).toHaveBeenCalledWith(
      'u1',
      '/uploads/avatars/u1.png',
    );
    expect(result.pictureUrl).toBe('/uploads/avatars/u1.png');
    expect(result.message).toBe('Profile picture updated successfully');
  });

  it('throws BadRequest when no file is uploaded', async () => {
    await expect(
      controller.updateProfilePicture(undefined as any, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });
});
