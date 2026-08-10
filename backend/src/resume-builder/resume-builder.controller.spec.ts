import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';
import { StorageService } from '../storage';

// resume-builder.service (imported transitively) pulls in uuid (ESM).
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('ResumeBuilderController (PDF serve via storage)', () => {
  let controller: ResumeBuilderController;

  const service = {
    getPDFPath: jest.fn(),
  };
  const storage = {
    getBuffer: jest.fn(),
  };

  const req = { user: { _id: 'u1' } };
  const buildRes = () => ({
    setHeader: jest.fn(),
    send: jest.fn(),
  });

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

  it('reads the PDF from storage by key and sends the buffer', async () => {
    const buf = Buffer.from('pdf');
    service.getPDFPath.mockResolvedValue('resumes/r1/1.pdf');
    storage.getBuffer.mockResolvedValue(buf);
    const res: any = buildRes();

    await controller.getPDF('r1', req, res);

    expect(service.getPDFPath).toHaveBeenCalledWith('r1', 'u1');
    expect(storage.getBuffer).toHaveBeenCalledWith('resumes/r1/1.pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(buf);
  });

  it('throws NotFound when the object is missing from storage', async () => {
    service.getPDFPath.mockResolvedValue('resumes/r1/1.pdf');
    storage.getBuffer.mockRejectedValue(new Error('missing'));
    const res: any = buildRes();

    await expect(controller.getPDF('r1', req, res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(res.send).not.toHaveBeenCalled();
  });
});
