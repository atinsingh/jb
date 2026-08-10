import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';
import { StorageService } from '../storage';

describe('CoverLettersController (PDF serve via storage)', () => {
  let controller: CoverLettersController;

  const service = {
    getPDFPath: jest.fn(),
  };
  const storage = {
    getBuffer: jest.fn(),
  };

  const req = { user: { _id: 'u1' } };
  const buildRes = () => ({ setHeader: jest.fn(), send: jest.fn() });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CoverLettersController],
      providers: [
        { provide: CoverLettersService, useValue: service },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    controller = moduleRef.get<CoverLettersController>(CoverLettersController);
  });

  it('reads the PDF from storage by key and sends the buffer', async () => {
    const buf = Buffer.from('pdf');
    service.getPDFPath.mockResolvedValue('cover-letters/cl1.pdf');
    storage.getBuffer.mockResolvedValue(buf);
    const res: any = buildRes();

    await controller.getPDF('cl1', req, res);

    expect(service.getPDFPath).toHaveBeenCalledWith('cl1', 'u1');
    expect(storage.getBuffer).toHaveBeenCalledWith('cover-letters/cl1.pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(buf);
  });

  it('throws NotFound when the object is missing from storage', async () => {
    service.getPDFPath.mockResolvedValue('cover-letters/cl1.pdf');
    storage.getBuffer.mockRejectedValue(new Error('missing'));
    const res: any = buildRes();

    await expect(controller.getPDF('cl1', req, res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(res.send).not.toHaveBeenCalled();
  });
});
